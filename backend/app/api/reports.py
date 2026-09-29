from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem, WasteRecord
from app.api.deps import get_current_user
from app.services.priority_engine import priority_engine
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Report Generation"])

@router.get("/pdf")
def export_pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).all()
    ranked = priority_engine.rank_inventory(items, user_type=current_user.user_type)

    waste_records = db.query(WasteRecord).filter(WasteRecord.user_id == current_user.id).all()
    total_loss = sum(w.estimated_loss for w in waste_records)
    
    kpis = {
        "total_inventory_items": len(items),
        "expiring_within_3_days": sum(1 for r in ranked if 0 <= r["days_to_expiry"] <= 3),
        "high_risk_items": sum(1 for r in ranked if r["risk_level"] in ["HIGH", "CRITICAL"]),
        "estimated_waste_qty": round(sum(r["potential_waste_qty"] for r in ranked), 2),
        "estimated_money_at_risk": round(sum(r["potential_financial_loss"] for r in ranked), 2),
        "estimated_money_saved": round(sum(r["potential_financial_loss"] for r in ranked) * 0.75, 2)
    }

    pdf_bytes = report_service.generate_pdf_report(
        user_name=current_user.full_name,
        user_type=current_user.user_type,
        inventory_items=ranked,
        waste_stats={"total_loss": total_loss},
        kpis=kpis
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=wastewise_audit_report.pdf"}
    )
