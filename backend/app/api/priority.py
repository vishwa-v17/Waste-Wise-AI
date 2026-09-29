from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem
from app.schemas.all_schemas import PriorityItem
from app.api.deps import get_current_user
from app.services.priority_engine import priority_engine

router = APIRouter(prefix="/priority", tags=["Smart Priority Queue"])

@router.get("", response_model=List[PriorityItem])
def get_priority_queue(
    risk_level: Optional[str] = None, # CRITICAL, HIGH, MEDIUM, LOW, All
    expiry_period: Optional[str] = None, # today, 3_days, 7_days, All
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id)
    if category and category != "All":
        query = query.filter(InventoryItem.category == category)
        
    items = query.all()
    ranked = priority_engine.rank_inventory(items, user_type=current_user.user_type)

    results = []
    for item in ranked:
        # Filter by risk level
        if risk_level and risk_level != "All" and item["risk_level"] != risk_level:
            continue

        # Filter by expiry horizon
        days = item["days_to_expiry"]
        if expiry_period == "today" and days != 0:
            continue
        elif expiry_period == "3_days" and not (0 <= days <= 3):
            continue
        elif expiry_period == "7_days" and not (0 <= days <= 7):
            continue

        results.append(PriorityItem(
            id=item["item_id"],
            product_name=item["product_name"],
            category=item["category"],
            quantity=item["quantity"],
            unit=item["unit"],
            expiry_date=item["expiry_date"],
            days_to_expiry=item["days_to_expiry"],
            daily_consumption_rate=item["daily_consumption_rate"],
            predicted_demand_before_expiry=item.get("predicted_3d_demand", 0.0),
            potential_waste_qty=item["potential_waste_qty"],
            potential_financial_loss=item["potential_financial_loss"],
            waste_risk_score=item["waste_risk_score"],
            risk_level=item["risk_level"],
            recommended_action=item["recommended_action"],
            action_reason=item["action_reason"],
            risk_factors=item["risk_factors"],
            storage_type=item["storage_type"],
            storage_location=item["storage_location"]
        ))

    return results
