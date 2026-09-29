from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem, WasteRecord, ConsumptionRecord, AuditLog
from app.schemas.all_schemas import WasteCreate, WasteResponse, ConsumptionCreate, ConsumptionResponse
from app.api.deps import get_current_user

router = APIRouter(tags=["Waste & Consumption Tracking"])

@router.get("/waste", response_model=List[WasteResponse])
def get_waste_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WasteRecord).filter(WasteRecord.user_id == current_user.id).order_by(WasteRecord.date.desc()).all()

@router.post("/waste", response_model=WasteResponse, status_code=status.HTTP_201_CREATED)
def record_waste(
    waste_in: WasteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Calculate loss if not provided
    loss = waste_in.estimated_loss or 0.0
    inventory_item = None

    if waste_in.inventory_id:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.id == waste_in.inventory_id,
            InventoryItem.user_id == current_user.id
        ).first()
        if not inventory_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced inventory item not found or does not belong to your account."
            )

    if inventory_item:
        if loss <= 0.0 and inventory_item.purchase_price > 0:
            loss = round(waste_in.quantity * inventory_item.purchase_price, 2)
        # Deduct or close out inventory item
        if inventory_item.quantity > waste_in.quantity:
            inventory_item.quantity = round(inventory_item.quantity - waste_in.quantity, 2)
        else:
            inventory_item.quantity = 0.0

    record = WasteRecord(
        user_id=current_user.id,
        inventory_id=waste_in.inventory_id,
        product_name=waste_in.product_name.strip(),
        category=waste_in.category,
        quantity=waste_in.quantity,
        unit=waste_in.unit,
        reason=waste_in.reason,
        date=waste_in.date or date.today(),
        estimated_loss=loss,
        notes=waste_in.notes
    )
    db.add(record)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="WASTE_RECORDED",
        details=f"Logged waste: {record.quantity} {record.unit} of {record.product_name} (Reason: {record.reason}, Loss: INR {record.estimated_loss})"
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return record

@router.get("/consumption", response_model=List[ConsumptionResponse])
def get_consumption_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ConsumptionRecord).filter(ConsumptionRecord.user_id == current_user.id).order_by(ConsumptionRecord.date.desc()).all()

@router.post("/consumption", response_model=ConsumptionResponse, status_code=status.HTTP_201_CREATED)
def record_consumption(
    cons_in: ConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inventory_item = None
    if cons_in.inventory_id:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.id == cons_in.inventory_id,
            InventoryItem.user_id == current_user.id
        ).first()
        if not inventory_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced inventory item not found or does not belong to your account."
            )

    if inventory_item:
        if inventory_item.quantity > cons_in.quantity:
            inventory_item.quantity = round(inventory_item.quantity - cons_in.quantity, 2)
        else:
            inventory_item.quantity = 0.0

    record = ConsumptionRecord(
        user_id=current_user.id,
        inventory_id=cons_in.inventory_id,
        product_name=cons_in.product_name.strip(),
        category=cons_in.category,
        quantity=cons_in.quantity,
        unit=cons_in.unit,
        date=cons_in.date or date.today(),
        notes=cons_in.notes
    )
    db.add(record)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="CONSUMPTION_RECORDED",
        details=f"Logged consumption: {record.quantity} {record.unit} of {record.product_name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return record
