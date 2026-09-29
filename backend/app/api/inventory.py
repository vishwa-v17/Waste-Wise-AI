from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem, ConsumptionRecord, WasteRecord, Notification, AuditLog
from app.schemas.all_schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from app.api.deps import get_current_user
from app.services.priority_engine import priority_engine
from app.services.barcode_service import barcode_service

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/barcode/{code}")
def lookup_barcode(code: str, current_user: User = Depends(get_current_user)):
    """
    Public OpenFoodFacts product lookup.
    User manually verifies and enters expiry date and quantity.
    """
    from app.core.security import is_valid_barcode
    clean_code = code.strip()
    if not is_valid_barcode(clean_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid barcode format. Barcodes must be 3-32 alphanumeric characters."
        )
    product_info = barcode_service.lookup_barcode(clean_code)
    if not product_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product barcode not found in global database. Please enter details manually."
        )
    return product_info

@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    expiry_filter: Optional[str] = None, # today, 3_days, 7_days, expired
    sort_by: Optional[str] = "expiry_date", # expiry_date, quantity, risk_score, product_name
    order: Optional[str] = "asc", # asc, desc
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((InventoryItem.product_name.ilike(s)) | (InventoryItem.supplier.ilike(s)) | (InventoryItem.notes.ilike(s)))

    if category and category != "All":
        query = query.filter(InventoryItem.category == category)

    items = query.all()

    # Calculate dynamic priority, risk scores, demand prediction
    ranked_list = priority_engine.rank_inventory(items, user_type=current_user.user_type)
    
    # Map back to InventoryResponse objects with dynamic fields
    results = []
    today = date.today()

    for item in items:
        # Match with priority evaluation
        eval_meta = next((r for r in ranked_list if r["item_id"] == item.id), None)
        if not eval_meta:
            continue

        # Filter by risk level if requested
        if risk_level and risk_level != "All" and eval_meta["risk_level"] != risk_level:
            continue

        # Filter by expiry period
        days = eval_meta["days_to_expiry"]
        if expiry_filter == "today" and days != 0:
            continue
        elif expiry_filter == "3_days" and not (0 <= days <= 3):
            continue
        elif expiry_filter == "7_days" and not (0 <= days <= 7):
            continue
        elif expiry_filter == "expired" and days >= 0:
            continue

        resp = InventoryResponse(
            id=item.id,
            user_id=item.user_id,
            product_name=item.product_name,
            category=item.category,
            quantity=item.quantity,
            unit=item.unit,
            purchase_date=item.purchase_date,
            expiry_date=item.expiry_date,
            purchase_price=item.purchase_price,
            current_value=item.current_value,
            storage_type=item.storage_type,
            storage_location=item.storage_location,
            supplier=item.supplier,
            barcode=item.barcode,
            notes=item.notes,
            created_at=item.created_at,
            updated_at=item.updated_at,
            days_to_expiry=eval_meta["days_to_expiry"],
            waste_risk_score=eval_meta["waste_risk_score"],
            risk_level=eval_meta["risk_level"],
            priority_rank=eval_meta["priority_rank"],
            recommended_action=eval_meta["recommended_action"],
            action_reason=eval_meta["action_reason"],
            risk_factors=eval_meta["risk_factors"],
            predicted_7d_demand=eval_meta["predicted_7d_demand"],
            potential_waste_qty=eval_meta["potential_waste_qty"],
            potential_financial_loss=eval_meta["potential_financial_loss"]
        )
        results.append(resp)

    # Sorting
    reverse = (order == "desc")
    if sort_by == "risk_score":
        results.sort(key=lambda x: x.waste_risk_score, reverse=reverse)
    elif sort_by == "quantity":
        results.sort(key=lambda x: x.quantity, reverse=reverse)
    elif sort_by == "product_name":
        results.sort(key=lambda x: x.product_name.lower(), reverse=reverse)
    else: # default expiry_date
        results.sort(key=lambda x: x.expiry_date, reverse=reverse)

    return results

@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_val = item_in.current_value if item_in.current_value is not None else item_in.purchase_price
    
    item = InventoryItem(
        user_id=current_user.id,
        product_name=item_in.product_name.strip(),
        category=item_in.category,
        quantity=item_in.quantity,
        unit=item_in.unit,
        purchase_date=item_in.purchase_date,
        expiry_date=item_in.expiry_date,
        purchase_price=item_in.purchase_price,
        current_value=current_val,
        storage_type=item_in.storage_type,
        storage_location=item_in.storage_location,
        supplier=item_in.supplier,
        barcode=item_in.barcode,
        notes=item_in.notes
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Evaluate dynamic risk
    eval_meta = priority_engine.evaluate_inventory_item(item, user_type=current_user.user_type)

    # Trigger notification if item is critical or expiring immediately
    if eval_meta["risk_level"] == "CRITICAL" or eval_meta["days_to_expiry"] <= 2:
        notif = Notification(
            user_id=current_user.id,
            title=f"Critical Alert: {item.product_name}",
            message=f"{item.product_name} expires in {eval_meta['days_to_expiry']} days. Recommended: {eval_meta['recommended_action']}.",
            type="critical" if eval_meta["risk_level"] == "CRITICAL" else "warning"
        )
        db.add(notif)
        db.commit()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="INVENTORY_ITEM_CREATED",
        details=f"Added {item.product_name} ({item.quantity} {item.unit}), expiry: {item.expiry_date}"
    )
    db.add(audit)
    db.commit()

    return InventoryResponse(
        id=item.id,
        user_id=item.user_id,
        product_name=item.product_name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        purchase_date=item.purchase_date,
        expiry_date=item.expiry_date,
        purchase_price=item.purchase_price,
        current_value=item.current_value,
        storage_type=item.storage_type,
        storage_location=item.storage_location,
        supplier=item.supplier,
        barcode=item.barcode,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
        days_to_expiry=eval_meta["days_to_expiry"],
        waste_risk_score=eval_meta["waste_risk_score"],
        risk_level=eval_meta["risk_level"],
        priority_rank=1,
        recommended_action=eval_meta["recommended_action"],
        action_reason=eval_meta["action_reason"],
        risk_factors=eval_meta["risk_factors"],
        predicted_7d_demand=eval_meta["predicted_7d_demand"],
        potential_waste_qty=eval_meta["potential_waste_qty"],
        potential_financial_loss=eval_meta["potential_financial_loss"]
    )

@router.get("/{item_id}", response_model=InventoryResponse)
def get_inventory_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    eval_meta = priority_engine.evaluate_inventory_item(item, user_type=current_user.user_type)

    return InventoryResponse(
        id=item.id,
        user_id=item.user_id,
        product_name=item.product_name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        purchase_date=item.purchase_date,
        expiry_date=item.expiry_date,
        purchase_price=item.purchase_price,
        current_value=item.current_value,
        storage_type=item.storage_type,
        storage_location=item.storage_location,
        supplier=item.supplier,
        barcode=item.barcode,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
        days_to_expiry=eval_meta["days_to_expiry"],
        waste_risk_score=eval_meta["waste_risk_score"],
        risk_level=eval_meta["risk_level"],
        priority_rank=1,
        recommended_action=eval_meta["recommended_action"],
        action_reason=eval_meta["action_reason"],
        risk_factors=eval_meta["risk_factors"],
        predicted_7d_demand=eval_meta["predicted_7d_demand"],
        potential_waste_qty=eval_meta["potential_waste_qty"],
        potential_financial_loss=eval_meta["potential_financial_loss"]
    )

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int,
    item_update: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    update_dict = item_update.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    eval_meta = priority_engine.evaluate_inventory_item(item, user_type=current_user.user_type)

    audit = AuditLog(
        user_id=current_user.id,
        action="INVENTORY_ITEM_UPDATED",
        details=f"Updated item {item.product_name} (ID: {item.id})"
    )
    db.add(audit)
    db.commit()

    return InventoryResponse(
        id=item.id,
        user_id=item.user_id,
        product_name=item.product_name,
        category=item.category,
        quantity=item.quantity,
        unit=item.unit,
        purchase_date=item.purchase_date,
        expiry_date=item.expiry_date,
        purchase_price=item.purchase_price,
        current_value=item.current_value,
        storage_type=item.storage_type,
        storage_location=item.storage_location,
        supplier=item.supplier,
        barcode=item.barcode,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
        days_to_expiry=eval_meta["days_to_expiry"],
        waste_risk_score=eval_meta["waste_risk_score"],
        risk_level=eval_meta["risk_level"],
        priority_rank=1,
        recommended_action=eval_meta["recommended_action"],
        action_reason=eval_meta["action_reason"],
        risk_factors=eval_meta["risk_factors"],
        predicted_7d_demand=eval_meta["predicted_7d_demand"],
        potential_waste_qty=eval_meta["potential_waste_qty"],
        potential_financial_loss=eval_meta["potential_financial_loss"]
    )

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    audit = AuditLog(
        user_id=current_user.id,
        action="INVENTORY_ITEM_DELETED",
        details=f"Deleted item {item.product_name} (ID: {item.id})"
    )
    db.add(audit)
    db.delete(item)
    db.commit()
    return None
