from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    user_type = Column(String(50), default="restaurant_canteen", nullable=False) # personal, restaurant_canteen, grocery
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")
    consumption_records = relationship("ConsumptionRecord", back_populates="user", cascade="all, delete-orphan")
    waste_records = relationship("WasteRecord", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class InventoryItem(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True) # Dairy, Bakery, Produce, Meat & Seafood, Pantry, Beverages, Prepared Food, Other
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(50), nullable=False, default="units") # kg, L, units, packs, g, ml
    purchase_date = Column(Date, nullable=False, default=date.today)
    expiry_date = Column(Date, nullable=False, index=True)
    purchase_price = Column(Float, nullable=False, default=0.0) # total purchase price or unit price
    current_value = Column(Float, nullable=False, default=0.0)
    storage_type = Column(String(100), nullable=False, default="Refrigerator") # Refrigerator, Freezer, Pantry, Room temperature, Other
    storage_location = Column(String(255), default="Main Shelf")
    supplier = Column(String(255), nullable=True)
    barcode = Column(String(100), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="inventory_items")
    consumption_records = relationship("ConsumptionRecord", back_populates="inventory_item")
    waste_records = relationship("WasteRecord", back_populates="inventory_item")

class ConsumptionRecord(Base):
    __tablename__ = "consumption_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    date = Column(Date, nullable=False, default=date.today, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="consumption_records")
    inventory_item = relationship("InventoryItem", back_populates="consumption_records")

class WasteRecord(Base):
    __tablename__ = "waste_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    reason = Column(String(100), nullable=False) # Expired, Spoiled, Over-purchased, Low demand, Damaged, Storage problem, Other
    date = Column(Date, nullable=False, default=date.today, index=True)
    estimated_loss = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="waste_records")
    inventory_item = relationship("InventoryItem", back_populates="waste_records")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="warning") # critical, warning, info, success
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ModelMetric(Base):
    __tablename__ = "model_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    model_type = Column(String(100), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2 = Column(Float, nullable=False)
    dataset_size = Column(Integer, nullable=False)
    features = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=False)
    trained_at = Column(DateTime, default=datetime.utcnow)
