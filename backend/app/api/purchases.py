from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem
from app.schemas.all_schemas import PurchaseRecommendation
from app.api.deps import get_current_user
from app.services.reorder_service import reorder_engine
from app.ml.demand_predictor import demand_predictor

router = APIRouter(prefix="/purchases", tags=["Smart Purchases & Reordering"])

@router.get("/recommendations", response_model=List[PurchaseRecommendation])
def get_purchase_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).all()
    
    # Group by product_name
    grouped = {}
    for item in items:
        pname = item.product_name
        if pname not in grouped:
            grouped[pname] = {
                "category": item.category,
                "unit": item.unit,
                "total_stock": 0.0
            }
        grouped[pname]["total_stock"] += item.quantity

    recommendations = []
    for pname, meta in grouped.items():
        # Predict weekly demand using ML engine
        pred_demand = demand_predictor.predict_demand(
            product_name=pname,
            category=meta["category"],
            current_stock=meta["total_stock"]
        )
        weekly_demand = pred_demand["pred_7d"]
        avg_weekly_cons = weekly_demand * 0.95 # baseline historical proxy

        rec = reorder_engine.evaluate_purchase(
            product_name=pname,
            category=meta["category"],
            current_stock=meta["total_stock"],
            unit=meta["unit"],
            avg_weekly_consumption=avg_weekly_cons,
            predicted_weekly_demand=weekly_demand
        )

        recommendations.append(PurchaseRecommendation(**rec))

    # Sort so BUY and BUY LESS come first
    order_rank = {"BUY": 1, "MONITOR": 2, "WAIT": 3, "BUY LESS": 4, "DO NOT BUY": 5}
    recommendations.sort(key=lambda x: order_rank.get(x.recommendation, 6))

    return recommendations
