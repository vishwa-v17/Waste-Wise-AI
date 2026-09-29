from datetime import date
from typing import List, Dict, Any
from app.services.risk_engine import waste_risk_engine
from app.services.recommendation_engine import recommendation_engine
from app.ml.demand_predictor import demand_predictor

class PriorityEngine:
    @staticmethod
    def evaluate_inventory_item(
        item: Any,
        user_type: str = "restaurant_canteen",
        avg_daily_consumption: float = None
    ) -> Dict[str, Any]:
        """
        Calculates dynamic priority score, waste risk, demand prediction,
        and recommended action for an inventory item.
        """
        today = date.today()
        days_to_expiry = (item.expiry_date - today).days

        # Determine daily consumption rate (fallback to category heuristic if not tracked)
        if avg_daily_consumption is None:
            # Default consumption rates based on category heuristics
            category_defaults = {
                "Dairy": 2.0,
                "Bakery": 2.5,
                "Produce": 2.0,
                "Meat & Seafood": 2.5,
                "Beverages": 1.5,
                "Pantry": 1.0,
                "Prepared Food": 2.0,
                "Other": 1.5
            }
            daily_rate = category_defaults.get(item.category, 1.5)
        else:
            daily_rate = max(0.1, avg_daily_consumption)

        # ML Demand Prediction for 7 days
        demand_pred = demand_predictor.predict_demand(
            product_name=item.product_name,
            category=item.category,
            current_stock=item.quantity,
            avg_daily_consumption=daily_rate
        )

        # Calculate Waste Risk Score
        risk_result = waste_risk_engine.calculate_risk(
            product_name=item.product_name,
            category=item.category,
            quantity=item.quantity,
            unit=item.unit,
            expiry_date=item.expiry_date,
            purchase_price=item.purchase_price,
            daily_consumption_rate=daily_rate,
            storage_type=item.storage_type
        )

        # Generate Action Recommendation
        rec_result = recommendation_engine.get_recommendation(
            product_name=item.product_name,
            category=item.category,
            quantity=item.quantity,
            unit=item.unit,
            days_to_expiry=days_to_expiry,
            potential_waste_qty=risk_result["potential_waste_qty"],
            waste_risk_score=risk_result["waste_risk_score"],
            risk_level=risk_result["risk_level"],
            user_type=user_type
        )

        # Priority ranking score: Higher = more urgent
        # Heavily driven by risk score, potential loss, and days to expiry
        urgency_multiplier = 1.0
        if days_to_expiry <= 0:
            urgency_multiplier = 2.0
        elif days_to_expiry <= 2:
            urgency_multiplier = 1.5
        elif days_to_expiry <= 5:
            urgency_multiplier = 1.2

        priority_score = round(risk_result["waste_risk_score"] * urgency_multiplier + min(50.0, risk_result["potential_financial_loss"] * 0.05), 1)

        return {
            "item_id": item.id,
            "product_name": item.product_name,
            "category": item.category,
            "quantity": item.quantity,
            "unit": item.unit,
            "purchase_date": item.purchase_date,
            "expiry_date": item.expiry_date,
            "storage_type": item.storage_type,
            "storage_location": item.storage_location,
            "days_to_expiry": days_to_expiry,
            "daily_consumption_rate": daily_rate,
            "waste_risk_score": risk_result["waste_risk_score"],
            "risk_level": risk_result["risk_level"],
            "priority_score": priority_score,
            "potential_waste_qty": risk_result["potential_waste_qty"],
            "potential_financial_loss": risk_result["potential_financial_loss"],
            "predicted_7d_demand": demand_pred["pred_7d"],
            "predicted_1d_demand": demand_pred["pred_1d"],
            "predicted_3d_demand": demand_pred["pred_3d"],
            "recommended_action": rec_result["action"],
            "action_reason": rec_result["reason"],
            "risk_factors": risk_result["risk_factors"]
        }

    @classmethod
    def rank_inventory(
        cls,
        items: List[Any],
        user_type: str = "restaurant_canteen",
        consumption_map: Dict[str, float] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates and ranks all inventory items into an actionable Priority Queue.
        Sorted descending by urgency.
        """
        consumption_map = consumption_map or {}
        evaluated = []
        for item in items:
            avg_rate = consumption_map.get(item.product_name.lower())
            eval_data = cls.evaluate_inventory_item(item, user_type=user_type, avg_daily_consumption=avg_rate)
            evaluated.append(eval_data)

        # Sort descending by priority_score, then ascending by days_to_expiry
        evaluated.sort(key=lambda x: (-x["priority_score"], x["days_to_expiry"], -x["potential_financial_loss"]))

        for idx, item in enumerate(evaluated, start=1):
            item["priority_rank"] = idx

        return evaluated

priority_engine = PriorityEngine()
