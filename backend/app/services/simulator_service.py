from typing import Dict, Any

class SimulatorService:
    @staticmethod
    def simulate_scenario(
        current_quantity: float,
        days_to_expiry: int,
        daily_consumption_rate: float,
        purchase_price_per_unit: float,
        consumption_change_pct: float = 0.0,
        purchase_qty_change_pct: float = 0.0,
        days_extension: int = 0
    ) -> Dict[str, Any]:
        """
        Simulates what-if intervention outcomes.
        E.g. What happens if consumption increases by 20%?
        What if order quantity is reduced by 25%?
        What if storage shelf-life is extended by 2 days?
        """
        # Baseline calculations
        base_days = max(0, days_to_expiry)
        base_rate = max(0.1, daily_consumption_rate)
        base_expected_consumed = base_days * base_rate
        base_waste_qty = max(0.0, round(current_quantity - base_expected_consumed, 2))
        base_loss = round(base_waste_qty * purchase_price_per_unit, 2)

        # Simulated adjustments
        sim_qty = max(0.0, current_quantity * (1.0 + (purchase_qty_change_pct / 100.0)))
        sim_rate = max(0.1, base_rate * (1.0 + (consumption_change_pct / 100.0)))
        sim_days = max(0, base_days + days_extension)

        sim_expected_consumed = sim_days * sim_rate
        sim_waste_qty = max(0.0, round(sim_qty - sim_expected_consumed, 2))
        sim_loss = round(sim_waste_qty * purchase_price_per_unit, 2)

        waste_reduction_qty = max(0.0, round(base_waste_qty - sim_waste_qty, 2))
        money_saved = max(0.0, round(base_loss - sim_loss, 2))
        
        reduction_pct = 0.0
        if base_waste_qty > 0:
            reduction_pct = round((waste_reduction_qty / base_waste_qty) * 100.0, 1)

        explanation_parts = []
        if consumption_change_pct > 0:
            explanation_parts.append(f"Accelerating consumption by +{consumption_change_pct}% absorbs {round(sim_expected_consumed - base_expected_consumed, 1)} additional units.")
        if purchase_qty_change_pct < 0:
            explanation_parts.append(f"Downsizing batch size by {abs(purchase_qty_change_pct)}% eliminates initial surplus at purchase.")
        if days_extension > 0:
            explanation_parts.append(f"Extending freshness buffer by {days_extension} day(s) provides additional consumption window.")

        if not explanation_parts:
            explanation = "Baseline unchanged. Adjust scenario sliders to model waste reduction interventions."
        else:
            explanation = " ".join(explanation_parts) + f" Estimated waste reduction: {waste_reduction_qty} units (₹{money_saved} saved)."

        return {
            "baseline_expected_waste": base_waste_qty,
            "baseline_financial_loss": base_loss,
            "simulated_expected_waste": sim_waste_qty,
            "simulated_financial_loss": sim_loss,
            "waste_reduction_qty": waste_reduction_qty,
            "waste_reduction_pct": reduction_pct,
            "money_saved": money_saved,
            "explanation": explanation
        }

simulator_service = SimulatorService()
