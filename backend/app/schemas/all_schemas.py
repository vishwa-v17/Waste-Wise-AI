from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# --- User & Auth ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    user_type: str = Field(default="restaurant_canteen", pattern=r"^(personal|restaurant_canteen|grocery)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    sub: Optional[str] = None

# --- Inventory ---
class InventoryBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=50)
    quantity: float = Field(..., gt=0, le=1_000_000)
    unit: str = Field(default="units", min_length=1, max_length=30)
    purchase_date: date
    expiry_date: date
    purchase_price: float = Field(default=0.0, ge=0, le=10_000_000)
    current_value: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    storage_type: str = Field(default="Refrigerator", max_length=50)
    storage_location: Optional[str] = Field(default="Main Shelf", max_length=100)
    supplier: Optional[str] = Field(default=None, max_length=150)
    barcode: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    quantity: Optional[float] = Field(default=None, gt=0, le=1_000_000)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=30)
    purchase_date: Optional[date] = None
    expiry_date: Optional[date] = None
    purchase_price: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    current_value: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    storage_type: Optional[str] = Field(default=None, max_length=50)
    storage_location: Optional[str] = Field(default=None, max_length=100)
    supplier: Optional[str] = Field(default=None, max_length=150)
    barcode: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)

class InventoryResponse(InventoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    current_value: float
    created_at: datetime
    updated_at: datetime
    
    # Dynamic calculation fields added by priority/risk engine
    days_to_expiry: int = 0
    waste_risk_score: float = 0.0
    risk_level: str = "LOW" # LOW, MEDIUM, HIGH, CRITICAL
    priority_rank: int = 0
    recommended_action: str = "MONITOR"
    action_reason: str = ""
    risk_factors: List[str] = []
    predicted_7d_demand: float = 0.0
    potential_waste_qty: float = 0.0
    potential_financial_loss: float = 0.0

# --- Consumption & Waste ---
class ConsumptionCreate(BaseModel):
    inventory_id: Optional[int] = None
    product_name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=50)
    quantity: float = Field(..., gt=0, le=1_000_000)
    unit: str = Field(..., min_length=1, max_length=30)
    date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=1000)

class ConsumptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    inventory_id: Optional[int]
    product_name: str
    category: str
    quantity: float
    unit: str
    date: date
    notes: Optional[str]
    created_at: datetime

class WasteCreate(BaseModel):
    inventory_id: Optional[int] = None
    product_name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=50)
    quantity: float = Field(..., gt=0, le=1_000_000)
    unit: str = Field(..., min_length=1, max_length=30)
    reason: str = Field(..., min_length=1, max_length=100) # Expired, Spoiled, Over-purchased, Low demand, Damaged, Storage problem, Other
    date: Optional[date] = None
    estimated_loss: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    notes: Optional[str] = Field(default=None, max_length=1000)

class WasteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    inventory_id: Optional[int]
    product_name: str
    category: str
    quantity: float
    unit: str
    reason: str
    date: date
    estimated_loss: float
    notes: Optional[str]
    created_at: datetime

# --- Priority Queue ---
class PriorityItem(BaseModel):
    id: int
    product_name: str
    category: str
    quantity: float
    unit: str
    expiry_date: date
    days_to_expiry: int
    daily_consumption_rate: float
    predicted_demand_before_expiry: float
    potential_waste_qty: float
    potential_financial_loss: float
    waste_risk_score: float
    risk_level: str
    recommended_action: str
    action_reason: str
    risk_factors: List[str]
    storage_type: str
    storage_location: Optional[str]

# --- Analytics & Dashboard ---
class DashboardKPIs(BaseModel):
    total_inventory_items: int
    total_food_quantity: float
    expiring_today: int
    expiring_within_3_days: int
    expiring_within_7_days: int
    high_risk_items: int
    estimated_waste_qty: float
    estimated_money_at_risk: float
    estimated_money_saved: float
    actual_waste_cost_this_month: float
    waste_trend_pct: float
    consumption_trend_pct: float

class CategoryWasteStat(BaseModel):
    category: str
    wasted_qty: float
    financial_loss: float
    item_count: int

class ReasonWasteStat(BaseModel):
    reason: str
    wasted_qty: float
    financial_loss: float
    count: int

class TimeSeriesPoint(BaseModel):
    date: str
    waste_cost: float
    waste_qty: float
    consumed_qty: float
    saved_cost: float

class AnalyticsResponse(BaseModel):
    kpis: DashboardKPIs
    waste_by_category: List[CategoryWasteStat]
    waste_by_reason: List[ReasonWasteStat]
    time_series_monthly: List[TimeSeriesPoint]
    time_series_weekly: List[TimeSeriesPoint]
    top_wasted_products: List[Dict[str, Any]]
    highest_financial_losses: List[Dict[str, Any]]
    current_vs_previous_month: Dict[str, Any]

# --- Simulator ---
class SimulationRequest(BaseModel):
    inventory_id: Optional[int] = None
    product_name: Optional[str] = Field(default=None, max_length=150)
    category: Optional[str] = Field(default="Dairy", max_length=50)
    current_quantity: float = Field(..., gt=0, le=1_000_000)
    days_to_expiry: int = Field(..., ge=0, le=3650)
    daily_consumption_rate: float = Field(..., ge=0.01, le=100_000)
    purchase_price_per_unit: float = Field(..., ge=0, le=1_000_000)
    simulated_consumption_rate_change_pct: float = Field(default=0.0, ge=-90, le=500)
    simulated_purchase_quantity_change_pct: float = Field(default=0.0, ge=-90, le=500)
    simulated_days_extension: int = Field(default=0, ge=0, le=30)

class SimulationResponse(BaseModel):
    baseline_expected_waste: float
    baseline_financial_loss: float
    simulated_expected_waste: float
    simulated_financial_loss: float
    waste_reduction_qty: float
    waste_reduction_pct: float
    money_saved: float
    explanation: str

# --- Smart Purchases ---
class PurchaseRecommendation(BaseModel):
    product_name: str
    category: str
    current_stock: float
    unit: str
    avg_weekly_consumption: float
    predicted_weekly_demand: float
    days_of_supply: float
    recommendation: str # BUY, BUY LESS, DO NOT BUY, WAIT, MONITOR
    suggested_order_qty: float
    reason: str

# --- AI Chat & NL Search ---
class AiChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=4000)

class AiChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[AiChatMessage] = Field(default=[], max_length=20)

class AiChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = []
    related_items: List[Dict[str, Any]] = []

class NLQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)

class NLQueryResponse(BaseModel):
    interpreted_intent: str
    filters_applied: Dict[str, Any]
    matched_items: List[Dict[str, Any]]

# --- Notifications ---
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

# --- ML Model Hub ---
class ModelEvaluationMetric(BaseModel):
    model_name: str
    model_type: str
    mae: float
    rmse: float
    r2: float
    dataset_size: int
    features: List[str]
    is_active: bool
    trained_at: datetime
