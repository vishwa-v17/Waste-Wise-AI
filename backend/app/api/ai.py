from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, InventoryItem, WasteRecord
from app.schemas.all_schemas import AiChatRequest, AiChatResponse, NLQueryRequest, NLQueryResponse
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limit_ai
from app.services.ai_service import ai_service
from app.services.priority_engine import priority_engine

router = APIRouter(prefix="/ai", tags=["AI Assistant & Natural Language"])

@router.post("/chat", response_model=AiChatResponse, dependencies=[Depends(rate_limit_ai)])
def chat_with_ai(
    req: AiChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).all()
    ranked = priority_engine.rank_inventory(items, user_type=current_user.user_type)

    waste_records = db.query(WasteRecord).filter(WasteRecord.user_id == current_user.id).all()
    waste_stats = {
        "total_waste_records": len(waste_records),
        "total_loss": sum(w.estimated_loss for w in waste_records)
    }

    result = ai_service.answer_query(
        user_message=req.message,
        inventory_context=ranked,
        waste_stats=waste_stats,
        user_type=current_user.user_type
    )

    return AiChatResponse(**result)

@router.post("/search", response_model=NLQueryResponse, dependencies=[Depends(rate_limit_ai)])
def natural_language_search(
    req: NLQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).all()
    ranked = priority_engine.rank_inventory(items, user_type=current_user.user_type)

    result = ai_service.parse_natural_language_query(req.query, ranked)
    return NLQueryResponse(**result)
