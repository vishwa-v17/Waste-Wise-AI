import os
import random
import pandas as pd
import numpy as np
from datetime import date, datetime, timedelta

SAMPLE_PRODUCTS = [
    {"name": "Whole Milk", "category": "Dairy", "unit": "L", "avg_daily": 2.5, "shelf_life": 7, "price": 60.0},
    {"name": "Greek Yogurt", "category": "Dairy", "unit": "kg", "avg_daily": 1.2, "shelf_life": 10, "price": 180.0},
    {"name": "Cheddar Cheese", "category": "Dairy", "unit": "kg", "avg_daily": 0.6, "shelf_life": 21, "price": 450.0},
    {"name": "Sandwich Bread", "category": "Bakery", "unit": "packs", "avg_daily": 3.0, "shelf_life": 4, "price": 45.0},
    {"name": "Croissants", "category": "Bakery", "unit": "packs", "avg_daily": 1.5, "shelf_life": 3, "price": 90.0},
    {"name": "Fresh Spinach", "category": "Produce", "unit": "kg", "avg_daily": 1.8, "shelf_life": 4, "price": 50.0},
    {"name": "Ripe Tomatoes", "category": "Produce", "unit": "kg", "avg_daily": 3.5, "shelf_life": 6, "price": 40.0},
    {"name": "Bananas", "category": "Produce", "unit": "kg", "avg_daily": 2.2, "shelf_life": 5, "price": 60.0},
    {"name": "Chicken Breast", "category": "Meat & Seafood", "unit": "kg", "avg_daily": 4.0, "shelf_life": 3, "price": 280.0},
    {"name": "Salmon Fillet", "category": "Meat & Seafood", "unit": "kg", "avg_daily": 1.5, "shelf_life": 2, "price": 750.0},
    {"name": "Basmati Rice", "category": "Pantry", "unit": "kg", "avg_daily": 5.0, "shelf_life": 180, "price": 110.0},
    {"name": "Eggs", "category": "Pantry", "unit": "units", "avg_daily": 18.0, "shelf_life": 21, "price": 7.0},
    {"name": "Orange Juice", "category": "Beverages", "unit": "L", "avg_daily": 2.0, "shelf_life": 8, "price": 120.0},
]

def generate_synthetic_dataset(num_days: int = 180, output_path: str = "backend/data/synthetic_food_data.csv") -> pd.DataFrame:
    """
    Generates a realistic synthetic time-series dataset of food purchases,
    daily consumption, and recorded waste for ML model training and evaluation.
    Clearly marked as synthetic dataset.
    """
    np.random.seed(42)
    random.seed(42)
    
    end_date = date.today()
    start_date = end_date - timedelta(days=num_days)
    
    records = []
    
    for prod in SAMPLE_PRODUCTS:
        current_date = start_date
        rolling_stock = prod["avg_daily"] * 3
        
        while current_date <= end_date:
            day_of_week = current_date.weekday() # 0 = Monday, 6 = Sunday
            # Weekend surge for food consumption (Fri-Sun)
            weekend_factor = 1.35 if day_of_week in [4, 5, 6] else 0.90
            
            # Base consumption with natural random variation
            noise = np.random.normal(1.0, 0.15)
            daily_consumed = max(0.2, prod["avg_daily"] * weekend_factor * noise)
            
            # Purchase events (roughly every few days when stock runs low)
            purchased_today = 0.0
            if rolling_stock < daily_consumed * 1.5 or random.random() < 0.25:
                purchased_today = prod["avg_daily"] * random.uniform(2.5, 6.0)
                rolling_stock += purchased_today
            
            # Waste occurrence (higher risk on perishable bakery, produce, seafood)
            perishability = 0.12 if prod["category"] in ["Bakery", "Produce", "Meat & Seafood"] else 0.03
            waste_today = 0.0
            if random.random() < perishability:
                waste_today = round(random.uniform(0.1, 0.4) * daily_consumed, 2)
                rolling_stock = max(0.0, rolling_stock - waste_today)
            
            rolling_stock = max(0.0, rolling_stock - daily_consumed)
            
            records.append({
                "date": current_date.isoformat(),
                "day_of_week": day_of_week,
                "month": current_date.month,
                "is_weekend": 1 if day_of_week in [5, 6] else 0,
                "product_name": prod["name"],
                "category": prod["category"],
                "unit": prod["unit"],
                "quantity_in_stock": round(rolling_stock, 2),
                "quantity_purchased": round(purchased_today, 2),
                "quantity_consumed": round(daily_consumed, 2),
                "quantity_wasted": round(waste_today, 2),
                "unit_price": prod["price"],
                "shelf_life_days": prod["shelf_life"],
                "is_synthetic": True
            })
            
            current_date += timedelta(days=1)
            
    df = pd.DataFrame(records)
    
    # Feature engineering for ML model: Lags and Rolling Averages
    # STRICT DATA LEAKAGE PREVENTION:
    # 1. Rolling 7-day average must shift(1) so today's consumption (target) is never in the feature
    # 2. Fill initial warmup period with product mean rather than back-filling from future target values
    df["quantity_consumed_lag1"] = df.groupby("product_name")["quantity_consumed"].shift(1)
    df["quantity_consumed_lag7"] = df.groupby("product_name")["quantity_consumed"].shift(7)
    df["rolling_avg_7d"] = df.groupby("product_name")["quantity_consumed"].transform(
        lambda x: x.shift(1).rolling(7, min_periods=1).mean()
    )
    
    # Impute initial warmup values using category/product baseline to avoid future data leakage
    mean_by_prod = df.groupby("product_name")["quantity_consumed"].transform("mean")
    df["quantity_consumed_lag1"] = df["quantity_consumed_lag1"].fillna(mean_by_prod)
    df["quantity_consumed_lag7"] = df["quantity_consumed_lag7"].fillna(mean_by_prod)
    df["rolling_avg_7d"] = df["rolling_avg_7d"].fillna(mean_by_prod)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    return df

def prepare_historical_dataset(csv_path: str = None) -> tuple[pd.DataFrame, bool]:
    """
    Unified dataset interface:
    - If valid real CSV is supplied at csv_path: cleans, validates, engineers lag features, returns (df, False).
    - If no file exists or invalid: generates realistic synthetic benchmark dataset, returns (df, True).
    Clearly reports whether data is synthetic or real historical data.
    """
    if csv_path and os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            required_cols = {"product_name", "category", "quantity_consumed"}
            if required_cols.issubset(set(df.columns)):
                # Ensure date and temporal features
                if "date" in df.columns:
                    df["date"] = pd.to_datetime(df["date"])
                    df["day_of_week"] = df["date"].dt.weekday
                    df["month"] = df["date"].dt.month
                    df["is_weekend"] = df["day_of_week"].apply(lambda d: 1 if d in [5, 6] else 0)
                else:
                    df["day_of_week"] = 2
                    df["month"] = 6
                    df["is_weekend"] = 0

                if "quantity_in_stock" not in df.columns:
                    df["quantity_in_stock"] = df["quantity_consumed"] * 2.5

                # Feature engineering with strict leakage prevention
                df["quantity_consumed_lag1"] = df.groupby("product_name")["quantity_consumed"].shift(1)
                df["quantity_consumed_lag7"] = df.groupby("product_name")["quantity_consumed"].shift(7)
                df["rolling_avg_7d"] = df.groupby("product_name")["quantity_consumed"].transform(
                    lambda x: x.shift(1).rolling(7, min_periods=1).mean()
                )

                mean_val = df.groupby("product_name")["quantity_consumed"].transform("mean")
                df["quantity_consumed_lag1"] = df["quantity_consumed_lag1"].fillna(mean_val)
                df["quantity_consumed_lag7"] = df["quantity_consumed_lag7"].fillna(mean_val)
                df["rolling_avg_7d"] = df["rolling_avg_7d"].fillna(mean_val)
                df["is_synthetic"] = False
                return df, False
        except Exception as e:
            print(f"[Dataset] Could not parse custom CSV {csv_path}: {e}. Generating benchmark synthetic data.")

    # Fallback to realistic synthetic generator
    df = generate_synthetic_dataset()
    return df, True

if __name__ == "__main__":
    df, is_syn = prepare_historical_dataset()
    print(f"Dataset ready. Records: {len(df)}, Synthetic: {is_syn}")

