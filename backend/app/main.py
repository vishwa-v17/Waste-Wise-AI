import os
from datetime import date, timedelta
from fastapi import FastAPI
import logging
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.models.all_models import User, InventoryItem, WasteRecord, ConsumptionRecord, Notification
from app.core.security import hash_password
from app.api import (
    auth,
    inventory,
    priority,
    waste,
    analytics,
    simulator,
    purchases,
    ai,
    reports,
    ml_admin,
    csv_tools,
    notifications
)

logger = logging.getLogger("wastewise.security")

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="WasteWise AI — Decision-support platform for food waste reduction, shelf-life risk prediction, and smart inventory prioritization.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs" if settings.ENVIRONMENT.lower() != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT.lower() != "production" else None,
)

# HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# Global Unhandled Exception Handler (prevents stack trace disclosure in production)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during {request.method} {request.url.path}: {exc}")
    if settings.ENVIRONMENT.lower() == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please contact the administrator."}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(priority.router, prefix=settings.API_V1_STR)
app.include_router(waste.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(simulator.router, prefix=settings.API_V1_STR)
app.include_router(purchases.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(ml_admin.router, prefix=settings.API_V1_STR)
app.include_router(csv_tools.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def init_seed_data(db_session=None, force: bool = False):
    """
    Seeds initial admin/demo user and baseline inventory if database is empty
    and ENABLE_DEMO_SEED is set to True (or force=True).
    """
    if not force and not settings.ENABLE_DEMO_SEED:
        print("[WasteWise Startup] Demo seeding disabled by configuration (ENABLE_DEMO_SEED=false).")
        return

    should_close = False
    if db_session is None:
        db = SessionLocal()
        should_close = True
    else:
        db = db_session

    try:
        admin = db.query(User).filter(User.email == "demo@wastewise.ai").first()
        if not admin:
            print("[WasteWise Startup] Seeding demo user and inventory...")
            admin = User(
                email="demo@wastewise.ai",
                hashed_password=hash_password("DemoPass123!"),
                full_name="Chef Marco (Bistro Central)",
                user_type="restaurant_canteen",
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

            today = date.today()

            # Seed realistic inventory
            demo_items = [
                # 1. Milk (Acceptance Scenario: 10 L, 2 days expiry, 2 L/day consumption)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Pasteurized Whole Milk",
                    category="Dairy",
                    quantity=10.0,
                    unit="L",
                    purchase_date=today - timedelta(days=5),
                    expiry_date=today + timedelta(days=2),
                    purchase_price=60.0,
                    current_value=60.0,
                    storage_type="Refrigerator",
                    storage_location="Dairy Walk-in Rack A",
                    supplier="Dairy Fresh Ltd",
                    notes="Daily milk supply. Fast turnover."
                ),
                # 2. Fresh Artisan Bread (Bakery, expires tomorrow)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Artisan Sandwich Bread",
                    category="Bakery",
                    quantity=6.0,
                    unit="packs",
                    purchase_date=today - timedelta(days=2),
                    expiry_date=today + timedelta(days=1),
                    purchase_price=45.0,
                    current_value=45.0,
                    storage_type="Pantry",
                    storage_location="Bakery Bread Bin",
                    supplier="Metro Bakers",
                    notes="Soft sandwich loaves."
                ),
                # 3. Organic Baby Spinach (Produce, expires in 3 days)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Organic Baby Spinach",
                    category="Produce",
                    quantity=4.5,
                    unit="kg",
                    purchase_date=today - timedelta(days=1),
                    expiry_date=today + timedelta(days=3),
                    purchase_price=55.0,
                    current_value=55.0,
                    storage_type="Refrigerator",
                    storage_location="Crisper Drawer 2",
                    supplier="GreenValley Organics"
                ),
                # 4. Fresh Chicken Breast (Meat & Seafood, expires in 2 days)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Chicken Breast Fillets",
                    category="Meat & Seafood",
                    quantity=8.0,
                    unit="kg",
                    purchase_date=today - timedelta(days=1),
                    expiry_date=today + timedelta(days=2),
                    purchase_price=260.0,
                    current_value=260.0,
                    storage_type="Refrigerator",
                    storage_location="Meat Cold Drawer (-1C)",
                    supplier="Prime Poultry"
                ),
                # 5. Greek Yogurt (Dairy, expires in 6 days)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Greek Yogurt Tub",
                    category="Dairy",
                    quantity=5.0,
                    unit="kg",
                    purchase_date=today - timedelta(days=3),
                    expiry_date=today + timedelta(days=6),
                    purchase_price=190.0,
                    current_value=190.0,
                    storage_type="Refrigerator",
                    storage_location="Dairy Walk-in Rack B",
                    supplier="Dairy Fresh Ltd"
                ),
                # 6. Basmati Rice (Pantry, expires in 120 days)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Royal Basmati Rice",
                    category="Pantry",
                    quantity=25.0,
                    unit="kg",
                    purchase_date=today - timedelta(days=15),
                    expiry_date=today + timedelta(days=120),
                    purchase_price=110.0,
                    current_value=110.0,
                    storage_type="Pantry",
                    storage_location="Dry Goods Aisle 3",
                    supplier="Indus Commodities"
                ),
                # 7. Ripe Bananas (Produce, expires today)
                InventoryItem(
                    user_id=admin.id,
                    product_name="Ripe Yellow Bananas",
                    category="Produce",
                    quantity=3.0,
                    unit="kg",
                    purchase_date=today - timedelta(days=4),
                    expiry_date=today,
                    purchase_price=50.0,
                    current_value=50.0,
                    storage_type="Room temperature",
                    storage_location="Fruit Display Crate",
                    supplier="GreenValley Organics"
                )
            ]
            db.add_all(demo_items)

            # Seed realistic historical waste
            demo_wastes = [
                WasteRecord(
                    user_id=admin.id,
                    product_name="Pasteurized Whole Milk",
                    category="Dairy",
                    quantity=2.0,
                    unit="L",
                    reason="Expired",
                    date=today - timedelta(days=8),
                    estimated_loss=120.0,
                    notes="Unused weekend stock souring."
                ),
                WasteRecord(
                    user_id=admin.id,
                    product_name="Sandwich Loaves",
                    category="Bakery",
                    quantity=3.0,
                    unit="packs",
                    reason="Low demand",
                    date=today - timedelta(days=14),
                    estimated_loss=135.0,
                    notes="Rainy weekday lower footfall."
                ),
                WasteRecord(
                    user_id=admin.id,
                    product_name="Salad Greens",
                    category="Produce",
                    quantity=1.8,
                    unit="kg",
                    reason="Spoiled",
                    date=today - timedelta(days=21),
                    estimated_loss=90.0,
                    notes="Moisture buildup in bag."
                ),
                WasteRecord(
                    user_id=admin.id,
                    product_name="Atlantic Salmon",
                    category="Meat & Seafood",
                    quantity=1.2,
                    unit="kg",
                    reason="Storage problem",
                    date=today - timedelta(days=35),
                    estimated_loss=840.0,
                    notes="Temp drift in secondary cooler."
                )
            ]
            db.add_all(demo_wastes)

            # Seed consumption records
            demo_consumptions = [
                ConsumptionRecord(
                    user_id=admin.id,
                    product_name="Pasteurized Whole Milk",
                    category="Dairy",
                    quantity=2.2,
                    unit="L",
                    date=today - timedelta(days=1)
                ),
                ConsumptionRecord(
                    user_id=admin.id,
                    product_name="Chicken Breast Fillets",
                    category="Meat & Seafood",
                    quantity=4.0,
                    unit="kg",
                    date=today - timedelta(days=1)
                ),
                ConsumptionRecord(
                    user_id=admin.id,
                    product_name="Artisan Sandwich Bread",
                    category="Bakery",
                    quantity=2.5,
                    unit="packs",
                    date=today - timedelta(days=1)
                )
            ]
            db.add_all(demo_consumptions)

            # Seed initial notifications
            demo_notif = Notification(
                user_id=admin.id,
                title="Immediate Action: Bananas Expiring Today",
                message="3.0 kg of Ripe Yellow Bananas expire TODAY. Use in smoothie or bake banana loaf immediately.",
                type="critical"
            )
            db.add(demo_notif)
            db.commit()
            print("[WasteWise Startup] Demo dataset initialized successfully.")
    finally:
        if should_close:
            db.close()

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "online",
        "version": settings.VERSION,
        "docs": "/docs",
        "api": "/api"
    }

@app.get("/health")
def health_check():
    """
    Standard deployment health check endpoint for Render, Vercel, and container health monitors.
    Returns status without disclosing sensitive configuration or database credentials.
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

