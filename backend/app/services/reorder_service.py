from typing import List, Dict, Any

class ReorderRecommendationEngine:
    @staticmethod
    def evaluate_purchase(
        product_name: str,
        category: str,
        current_stock: float,
        unit: str,
        avg_weekly_consumption: float,
        predicted_weekly_demand: float
    ) -> Dict[str, Any]:
        """
        Calculates smart purchasing advice based on current inventory,
        weekly run-rate, and ML-predicted demand.
        """
        weekly_demand = max(0.5, predicted_weekly_demand if predicted_weekly_demand > 0 else avg_weekly_consumption)
        days_of_supply = round((current_stock / (weekly_demand / 7.0)), 1) if weekly_demand > 0 else 99.0

        # Heuristics based on days of supply
        if days_of_supply <= 2.0:
            rec = "BUY"
            suggested_qty = round(weekly_demand * 1.5 - current_stock, 1)
            reason = f"Stock level is low ({days_of_supply} days of supply remaining). Restock immediately to prevent operational stockouts."
        elif days_of_supply <= 4.0:
            rec = "MONITOR"
            suggested_qty = round(weekly_demand * 1.2, 1)
            reason = f"Buffer is adequate for {days_of_supply} days. Prepare order requisition but verify delivery lead time."
        elif days_of_supply <= 7.0:
            rec = "WAIT"
            suggested_qty = 0.0
            reason = f"Current stock satisfies the entire upcoming 7-day demand cycle ({weekly_demand} {unit}). Wait before reordering."
        elif days_of_supply <= 14.0:
            rec = "BUY LESS"
            suggested_qty = round(weekly_demand * 0.5, 1)
            reason = f"Stock is robust ({days_of_supply} days of supply). If ordering, reduce batch size by 50% to prevent spoilage accumulation."
        else:
            rec = "DO NOT BUY"
            suggested_qty = 0.0
            reason = f"Substantial surplus ({current_stock} {unit} covering {days_of_supply} days). Strictly do not purchase additional stock yet."

        return {
            "product_name": product_name,
            "category": category,
            "current_stock": round(current_stock, 2),
            "unit": unit,
            "avg_weekly_consumption": round(avg_weekly_consumption, 2),
            "predicted_weekly_demand": round(weekly_demand, 2),
            "days_of_supply": days_of_supply,
            "recommendation": rec,
            "suggested_order_qty": max(0.0, suggested_qty),
            "reason": reason
        }

reorder_engine = ReorderRecommendationEngine()
