from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem
from app.schemas.all_schemas import SimulationRequest, SimulationResponse
from app.api.deps import get_current_user
from app.services.simulator_service import simulator_service

router = APIRouter(prefix="/simulator", tags=["What-If Simulator"])

@router.post("", response_model=SimulationResponse)
def run_simulation(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    qty = req.current_quantity
    days = req.days_to_expiry
    price = req.purchase_price_per_unit
    rate = req.daily_consumption_rate

    # If linked to an actual inventory item, populate if missing
    if req.inventory_id:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == req.inventory_id,
            InventoryItem.user_id == current_user.id
        ).first()
        if item:
            qty = item.quantity
            price = item.purchase_price

    res = simulator_service.simulate_scenario(
        current_quantity=qty,
        days_to_expiry=days,
        daily_consumption_rate=rate,
        purchase_price_per_unit=price,
        consumption_change_pct=req.simulated_consumption_rate_change_pct,
        purchase_qty_change_pct=req.simulated_purchase_quantity_change_pct,
        days_extension=req.simulated_days_extension
    )

    return SimulationResponse(**res)
