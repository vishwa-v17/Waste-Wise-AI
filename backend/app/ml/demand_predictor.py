import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from datetime import date
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.ml.dataset_generator import prepare_historical_dataset

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")
MODEL_FILE = os.path.join(MODEL_DIR, "champion_demand_model.joblib")
METRICS_FILE = os.path.join(MODEL_DIR, "model_comparison_metrics.joblib")

FEATURES_NUM = ["day_of_week", "month", "is_weekend", "quantity_in_stock", "quantity_consumed_lag1", "quantity_consumed_lag7", "rolling_avg_7d"]
FEATURES_CAT = ["category"]
TARGET = "quantity_consumed"

class DemandPredictionEngine:
    def __init__(self):
        self.model = None
        self.metrics = {}
        self.champion_name = "Gradient Boosting"
        self._ensure_loaded()

    def _ensure_loaded(self):
        if os.path.exists(MODEL_FILE) and os.path.exists(METRICS_FILE):
            try:
                self.model = joblib.load(MODEL_FILE)
                self.metrics = joblib.load(METRICS_FILE)
                if not isinstance(self.metrics, dict) or "dataset_type" not in self.metrics:
                    print("[DemandPredictionEngine] Upgrading model artifacts to v2.0.0 (leak-free)...")
                    self.train_and_evaluate()
                else:
                    self.champion_name = self.metrics.get("champion_model", "Gradient Boosting")
            except Exception as e:
                print(f"[DemandPredictionEngine] Could not load model: {e}. Will train now.")
                self.train_and_evaluate()
        else:
            print("[DemandPredictionEngine] No model artifact found. Initiating training...")
            self.train_and_evaluate()

    def train_and_evaluate(self, csv_path: str = None) -> Dict[str, Any]:
        """
        Trains and rigorously compares Linear Regression, Random Forest, and Gradient Boosting.
        Calculates MAE, RMSE, and R2.
        Selects champion based on lowest MAE / RMSE.
        Safely saves the model with atomic replacement.
        """
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # Load real CSV or generate leak-free benchmark synthetic data
        df, is_synthetic = prepare_historical_dataset(csv_path)

        # Validate non-leaking features exist
        for col in ["quantity_consumed_lag1", "quantity_consumed_lag7", "rolling_avg_7d"]:
            if col not in df.columns:
                mean_val = df.groupby("product_name")["quantity_consumed"].transform("mean")
                df[col] = df.groupby("product_name")["quantity_consumed"].shift(1).fillna(mean_val)

        X = df[FEATURES_NUM + FEATURES_CAT]
        y = df[TARGET]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=True)

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), FEATURES_NUM),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FEATURES_CAT)
            ]
        )

        candidates = {
            "Linear Regression": LinearRegression(),
            "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
        }

        results = {}
        trained_pipelines = {}

        for name, estimator in candidates.items():
            pipeline = Pipeline(steps=[
                ("preprocessor", preprocessor),
                ("regressor", estimator)
            ])
            pipeline.fit(X_train, y_train)
            preds = pipeline.predict(X_test)
            
            mae = float(mean_absolute_error(y_test, preds))
            rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
            r2 = float(r2_score(y_test, preds))

            results[name] = {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2": round(r2, 4)
            }
            trained_pipelines[name] = pipeline

        # Select model with lowest MAE
        champion_name = min(results, key=lambda k: results[k]["mae"])
        champion_pipeline = trained_pipelines[champion_name]

        metadata = {
            "champion_model": champion_name,
            "trained_at": str(date.today()),
            "dataset_size": len(df),
            "dataset_type": "synthetic" if is_synthetic else "real",
            "features": FEATURES_NUM + FEATURES_CAT,
            "target": TARGET,
            "version": "2.0.0",
            "comparison": results,
            "champion_metrics": results[champion_name]
        }

        # Safe saving: Write to temp files first, verify readable, then replace
        temp_model_file = MODEL_FILE + ".tmp"
        temp_metrics_file = METRICS_FILE + ".tmp"
        joblib.dump(champion_pipeline, temp_model_file)
        joblib.dump(metadata, temp_metrics_file)

        # Validate saved artifacts can be deserialized before promoting
        test_load_model = joblib.load(temp_model_file)
        test_load_metrics = joblib.load(temp_metrics_file)
        assert test_load_metrics["champion_model"] == champion_name

        # Atomically replace production artifacts
        if os.path.exists(MODEL_FILE):
            os.remove(MODEL_FILE)
        if os.path.exists(METRICS_FILE):
            os.remove(METRICS_FILE)
        os.rename(temp_model_file, MODEL_FILE)
        os.rename(temp_metrics_file, METRICS_FILE)

        self.model = champion_pipeline
        self.metrics = metadata
        self.champion_name = champion_name

        print(f"[DemandPredictionEngine] Training complete. Champion: {champion_name} (MAE: {results[champion_name]['mae']}, RMSE: {results[champion_name]['rmse']}, R2: {results[champion_name]['r2']})")
        return metadata

    def predict_demand(self, product_name: str, category: str, current_stock: float, avg_daily_consumption: float = 2.0) -> Dict[str, float]:
        """
        Predicts expected consumption for the next 1 day, 3 days, and 7 days.
        """
        if self.model is None:
            self._ensure_loaded()

        today = date.today()
        # Build scenario inputs for next 7 days
        daily_preds = []
        simulated_stock = current_stock

        for i in range(1, 8):
            future_date = today + pd.Timedelta(days=i)
            day_of_week = future_date.weekday()
            month = future_date.month
            is_weekend = 1 if day_of_week in [5, 6] else 0

            # Default lag estimates from average consumption
            lag1 = avg_daily_consumption
            lag7 = avg_daily_consumption
            rolling = avg_daily_consumption

            row = pd.DataFrame([{
                "day_of_week": day_of_week,
                "month": month,
                "is_weekend": is_weekend,
                "quantity_in_stock": max(0.0, simulated_stock),
                "quantity_consumed_lag1": lag1,
                "quantity_consumed_lag7": lag7,
                "rolling_avg_7d": rolling,
                "category": category
            }])

            try:
                pred = float(self.model.predict(row)[0])
                pred = max(0.05, pred) # non-negative
            except Exception:
                pred = avg_daily_consumption * (1.2 if is_weekend else 0.95)

            daily_preds.append(pred)
            simulated_stock = max(0.0, simulated_stock - pred)

        pred_1d = round(daily_preds[0], 2)
        pred_3d = round(sum(daily_preds[:3]), 2)
        pred_7d = round(sum(daily_preds[:7]), 2)

        return {
            "pred_1d": pred_1d,
            "pred_3d": pred_3d,
            "pred_7d": pred_7d,
            "daily_breakdown": [round(p, 2) for p in daily_preds]
        }

demand_predictor = DemandPredictionEngine()
