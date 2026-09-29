from datetime import date
from typing import Dict, List, Any

CATEGORY_PERISHABILITY = {
    "Meat & Seafood": 0.95,
    "Bakery": 0.90,
    "Prepared Food": 0.90,
    "Dairy": 0.85,
    "Produce": 0.80,
    "Beverages": 0.50,
    "Pantry": 0.20,
    "Other": 0.50
}

STORAGE_RISK_MULTIPLIER = {
    "Room temperature": 1.25,
    "Other": 1.10,
    "Refrigerator": 0.85,
    "Pantry": 0.90,
    "Freezer": 0.40
}

class WasteRiskEngine:
    @staticmethod
    def calculate_risk(
        product_name: str,
        category: str,
        quantity: float,
        unit: str,
        expiry_date: date,
        purchase_price: float,
        daily_consumption_rate: float,
        storage_type: str = "Refrigerator",
        historical_waste_rate: float = 0.05
    ) -> Dict[str, Any]:
        """
        Calculates a transparent, mathematically grounded Waste Risk Score from 0 to 100.
        Explains exact reasons driving the risk.
        Calculates expected leftover/waste quantity and financial loss.
        """
        today = date.today()
        days_to_expiry = (expiry_date - today).days

        # Ensure non-negative daily consumption
        effective_daily_rate = max(0.1, daily_consumption_rate)

        # 1. Days to Expiry Component (0 to 45 pts)
        if days_to_expiry <= 0:
            time_score = 45.0
        elif days_to_expiry <= 1:
            time_score = 42.0
        elif days_to_expiry <= 2:
            time_score = 38.0
        elif days_to_expiry <= 3:
            time_score = 32.0
        elif days_to_expiry <= 5:
            time_score = 25.0
        elif days_to_expiry <= 7:
            time_score = 18.0
        elif days_to_expiry <= 14:
            time_score = 10.0
        else:
            time_score = 3.0

        # 2. Demand vs Stock Ratio Component (0 to 35 pts)
        # Expected consumption before expiry:
        available_days = max(0, days_to_expiry)
        expected_consumed = available_days * effective_daily_rate
        
        potential_waste_qty = max(0.0, round(quantity - expected_consumed, 2))
        
        if quantity > 0:
            surplus_ratio = potential_waste_qty / quantity
        else:
            surplus_ratio = 0.0

        demand_score = min(35.0, surplus_ratio * 35.0)

        # 3. Product Category & Storage Sensitivity (0 to 15 pts)
        cat_weight = CATEGORY_PERISHABILITY.get(category, 0.50)
        storage_mult = STORAGE_RISK_MULTIPLIER.get(storage_type, 1.0)
        perishability_score = min(15.0, cat_weight * storage_mult * 15.0)

        # 4. Historical Waste Record Component (0 to 5 pts)
        history_score = min(5.0, historical_waste_rate * 25.0)

        # Total Raw Score
        raw_score = time_score + demand_score + perishability_score + history_score
        
        # Immediate boundary adjustments
        if days_to_expiry < 0:
            raw_score = 100.0
        elif days_to_expiry == 0 and quantity > 0:
            raw_score = max(90.0, raw_score)

        score = min(100.0, max(0.0, round(raw_score, 1)))

        # Categorize Level
        if score >= 81:
            risk_level = "CRITICAL"
        elif score >= 61:
            risk_level = "HIGH"
        elif score >= 31:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Financial Loss Estimation
        # unit price = purchase_price / quantity if purchase_price is total, else purchase_price
        unit_price = purchase_price if purchase_price > 0 else 0.0
        potential_loss = round(potential_waste_qty * unit_price, 2)

        # Transparent Reasons Breakdown
        reasons = []
        if days_to_expiry < 0:
            reasons.append(f"Expired {abs(days_to_expiry)} day(s) ago.")
        elif days_to_expiry == 0:
            reasons.append("Item expires TODAY.")
        elif days_to_expiry <= 2:
            reasons.append(f"Critical shelf life: Only {days_to_expiry} day(s) remaining.")
        elif days_to_expiry <= 7:
            reasons.append(f"Expiring soon: {days_to_expiry} days remaining.")

        if potential_waste_qty > 0:
            reasons.append(
                f"Current stock ({quantity} {unit}) exceeds predicted consumption "
                f"({round(expected_consumed, 1)} {unit}) before expiry by {potential_waste_qty} {unit}."
            )
        else:
            reasons.append(f"Normal consumption is projected to absorb current stock before expiry.")

        if cat_weight >= 0.8:
            reasons.append(f"{category} is a highly perishable category prone to rapid quality degradation.")

        if storage_type == "Room temperature" and cat_weight >= 0.7:
            reasons.append(f"Stored at room temperature, accelerating spoilage risk.")

        if historical_waste_rate > 0.15:
            reasons.append(f"Historical records show recurring waste for similar {category} inventory.")

        return {
            "waste_risk_score": score,
            "risk_level": risk_level,
            "days_to_expiry": days_to_expiry,
            "expected_consumed_before_expiry": round(expected_consumed, 2),
            "potential_waste_qty": potential_waste_qty,
            "potential_financial_loss": potential_loss,
            "risk_factors": reasons,
            "score_breakdown": {
                "time_score": round(time_score, 1),
                "demand_score": round(demand_score, 1),
                "perishability_score": round(perishability_score, 1),
                "history_score": round(history_score, 1)
            }
        }

waste_risk_engine = WasteRiskEngine()
