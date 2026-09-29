import io
import csv
import re
from datetime import datetime, date
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem, AuditLog
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limit_upload
from app.core.security import sanitize_csv_cell

router = APIRouter(prefix="/csv", tags=["CSV Import & Export"])

MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_CSV_ROWS = 2000

@router.get("/template")
def get_sample_csv_template():
    """
    Returns a downloadable sample CSV template for inventory bulk import.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "product_name",
        "category",
        "quantity",
        "unit",
        "purchase_date",
        "expiry_date",
        "purchase_price",
        "storage_type",
        "storage_location",
        "supplier"
    ])
    writer.writerow([
        "Pasteurized Milk",
        "Dairy",
        "10.0",
        "L",
        date.today().isoformat(),
        (date.today()).isoformat(),
        "60.0",
        "Refrigerator",
        "Top Shelf",
        "Dairy Fresh Farm"
    ])
    writer.writerow([
        "Whole Wheat Bread",
        "Bakery",
        "6.0",
        "packs",
        date.today().isoformat(),
        (date.today()).isoformat(),
        "40.0",
        "Pantry",
        "Bakery Rack",
        "Artisan Bakery"
    ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wastewise_inventory_template.csv"}
    )

@router.get("/export")
def export_inventory_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports the current user's inventory to CSV with formula injection protection.
    """
    items = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "product_name",
        "category",
        "quantity",
        "unit",
        "purchase_date",
        "expiry_date",
        "purchase_price",
        "storage_type",
        "storage_location",
        "supplier"
    ])
    for item in items:
        writer.writerow([
            sanitize_csv_cell(item.product_name),
            sanitize_csv_cell(item.category),
            item.quantity,
            sanitize_csv_cell(item.unit),
            item.purchase_date.isoformat() if item.purchase_date else "",
            item.expiry_date.isoformat() if item.expiry_date else "",
            item.purchase_price,
            sanitize_csv_cell(item.storage_type or ""),
            sanitize_csv_cell(item.storage_location or ""),
            sanitize_csv_cell(item.supplier or "")
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wastewise_inventory.csv"}
    )


@router.post("/import", dependencies=[Depends(rate_limit_upload)])
async def import_inventory_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validates and imports food inventory from uploaded CSV.
    Hardened against:
    - Memory exhaustion (5MB limit)
    - Row flood / CPU DoS (2000 row limit)
    - Formula injection (=, +, -, @)
    - Input bounds & type errors
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    content = await file.read()
    if len(content) > MAX_CSV_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"CSV file exceeds maximum allowed size of {MAX_CSV_SIZE_BYTES // (1024 * 1024)} MB."
        )

    try:
        decoded = content.decode("utf-8-sig")
    except Exception:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    required_cols = {"product_name", "category", "quantity", "unit", "expiry_date"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        missing = required_cols - set(reader.fieldnames or [])
        raise HTTPException(status_code=400, detail=f"Missing required columns in CSV: {', '.join(missing)}")

    success_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        if row_idx > MAX_CSV_ROWS + 1:
            errors.append(f"Row limit of {MAX_CSV_ROWS} exceeded. Remaining rows truncated.")
            break

        try:
            # Prevent CSV Formula Injection and truncate lengths
            p_name = sanitize_csv_cell(row.get("product_name", ""))[:150].strip()
            if not p_name:
                raise ValueError("product_name is required")

            cat = sanitize_csv_cell(row.get("category", "Other"))[:50].strip()
            qty = float(row.get("quantity", 1.0))
            if qty <= 0 or qty > 1_000_000:
                raise ValueError("quantity must be between 0.01 and 1,000,000")

            unit = sanitize_csv_cell(row.get("unit", "units"))[:30].strip()
            
            p_date_str = row.get("purchase_date")
            p_date = datetime.strptime(p_date_str.strip(), "%Y-%m-%d").date() if p_date_str else date.today()
            
            exp_date_str = row.get("expiry_date", "").strip()
            exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
            
            price_val = float(row.get("purchase_price", 0.0) or 0.0)
            if price_val < 0 or price_val > 10_000_000:
                raise ValueError("purchase_price must be between 0 and 10,000,000")

            storage = sanitize_csv_cell(row.get("storage_type", "Refrigerator"))[:50].strip()
            loc = sanitize_csv_cell(row.get("storage_location", "Main Shelf"))[:100].strip()
            supplier_raw = row.get("supplier", "").strip()
            supplier = sanitize_csv_cell(supplier_raw)[:150] if supplier_raw else None

            item = InventoryItem(
                user_id=current_user.id,
                product_name=p_name,
                category=cat,
                quantity=qty,
                unit=unit,
                purchase_date=p_date,
                expiry_date=exp_date,
                purchase_price=price_val,
                current_value=price_val,
                storage_type=storage,
                storage_location=loc,
                supplier=supplier
            )
            db.add(item)
            success_count += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")

    db.commit()

    # Sanitize filename for audit log
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename or "upload.csv")[:100]
    audit = AuditLog(
        user_id=current_user.id,
        action="CSV_INVENTORY_IMPORTED",
        details=f"Imported {success_count} items from {safe_filename} (Errors: {len(errors)})"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "completed",
        "imported_count": success_count,
        "errors": errors
    }
