from typing import Dict, Any

class RecommendationEngine:
    @staticmethod
    def get_recommendation(
        product_name: str,
        category: str,
        quantity: float,
        unit: str,
        days_to_expiry: int,
        potential_waste_qty: float,
        waste_risk_score: float,
        risk_level: str,
        user_type: str = "restaurant_canteen"
    ) -> Dict[str, str]:
        """
        Generates contextual action recommendations customized to user type:
        - personal
        - restaurant_canteen
        - grocery
        """
        # Expired items
        if days_to_expiry < 0:
            return {
                "action": "DISPOSE / AUDIT",
                "reason": f"{product_name} has passed its expiry date. Safely audit and log as waste to prevent health safety hazards."
            }

        # Case 1: CRITICAL RISK (Score >= 81 or days <= 1 with surplus)
        if risk_level == "CRITICAL":
            if user_type == "grocery":
                if days_to_expiry <= 1 and potential_waste_qty > 0:
                    return {
                        "action": "DISCOUNT",
                        "reason": f"Only {days_to_expiry} day left with {potential_waste_qty} {unit} surplus. Apply 50% quick-sale discount or clearance aisle placement immediately."
                    }
                else:
                    return {
                        "action": "DONATE",
                        "reason": f"Imminent expiry within {days_to_expiry} days. Coordinate immediate pickup with local food rescue / shelter partners."
                    }
            elif user_type == "personal":
                return {
                    "action": "USE FIRST",
                    "reason": f"Only {days_to_expiry} day(s) remain and {quantity} {unit} are in stock. Prioritize in today's cooking or freeze portions immediately."
                }
            else: # restaurant_canteen
                return {
                    "action": "USE FIRST",
                    "reason": f"Immediate action required: Prioritize {potential_waste_qty} {unit} into today's lunch/dinner special or staff meal prep."
                }

        # Case 2: HIGH RISK (Score 61-80)
        elif risk_level == "HIGH":
            if user_type == "grocery":
                return {
                    "action": "SELL FIRST",
                    "reason": f"Move {product_name} to front-facing shelf or apply 25% promotional discount before risk escalates to critical."
                }
            elif user_type == "personal":
                return {
                    "action": "USE FIRST",
                    "reason": f"Stock ({quantity} {unit}) is higher than usual consumption before expiry. Plan meals around this item over the next 48 hours."
                }
            else: # restaurant_canteen
                return {
                    "action": "USE FIRST",
                    "reason": f"Only {days_to_expiry} days remain with expected surplus of {potential_waste_qty} {unit}. Feature as Chef's Special or incorporate into batch sauces/soups."
                }

        # Case 3: MEDIUM RISK (Score 31-60)
        elif risk_level == "MEDIUM":
            if potential_waste_qty > 0:
                if user_type == "grocery":
                    return {
                        "action": "MONITOR",
                        "reason": f"Current velocity indicates {potential_waste_qty} {unit} may remain unsold. Monitor sales pace and hold back new restocking orders."
                    }
                else:
                    return {
                        "action": "REDUCE FUTURE PURCHASE",
                        "reason": f"Consumption pace is slower than stock volume. Adjust next replenishment order down to avoid surplus."
                    }
            else:
                return {
                    "action": "MONITOR",
                    "reason": f"Consumption is roughly on track with shelf life. Keep in eye-level storage and track daily usage."
                }

        # Case 4: LOW RISK (Score <= 30)
        else:
            return {
                "action": "NO ACTION",
                "reason": f"Healthy shelf-life buffer ({days_to_expiry} days). Predicted consumption easily covers current stock ({quantity} {unit})."
            }

recommendation_engine = RecommendationEngine()
