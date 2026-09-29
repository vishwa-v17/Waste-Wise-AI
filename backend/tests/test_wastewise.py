import pytest
from datetime import date, timedelta
from app.services.risk_engine import waste_risk_engine
from app.services.recommendation_engine import recommendation_engine
from app.services.priority_engine import priority_engine
from app.services.simulator_service import simulator_service
from app.services.reorder_service import reorder_engine
from app.services.ai_service import ai_service
from app.ml.demand_predictor import demand_predictor

class MockItem:
    def __init__(self, id, product_name, category, quantity, unit, expiry_date, purchase_price=60.0, storage_type="Refrigerator", storage_location="Main Shelf"):
        self.id = id
        self.product_name = product_name
        self.category = category
        self.quantity = quantity
        self.unit = unit
        self.purchase_date = date.today() - timedelta(days=3)
        self.expiry_date = expiry_date
        self.purchase_price = purchase_price
        self.storage_type = storage_type
        self.storage_location = storage_location

def test_milk_acceptance_scenario():
    """
    Final Acceptance Test Scenario:
    Milk:
    Quantity: 10 L
    Expiry: 2 days
    Average consumption: 2 L/day
    
    Verifies:
    1. Shelf life is 2 days.
    2. Expected consumption before expiry is 4 L (2 days * 2 L/day).
    3. Potential leftover/waste is 6 L (10 L - 4 L).
    4. Financial loss estimate is 6 * 60 = INR 360.
    5. Waste risk score is >= 61 (HIGH or CRITICAL).
    6. Recommendation is 'USE FIRST'.
    7. Transparent reasons explain remaining days and stock surplus.
    """
    today = date.today()
    expiry_2_days = today + timedelta(days=2)
    daily_consumption = 2.0
    quantity = 10.0
    price_per_unit = 60.0

    risk = waste_risk_engine.calculate_risk(
        product_name="Milk",
        category="Dairy",
        quantity=quantity,
        unit="L",
        expiry_date=expiry_2_days,
        purchase_price=price_per_unit,
        daily_consumption_rate=daily_consumption,
        storage_type="Refrigerator"
    )

    # 1. Remaining shelf life
    assert risk["days_to_expiry"] == 2

    # 2. Predicted consumption before expiry
    assert risk["expected_consumed_before_expiry"] == 4.0

    # 3. Potential leftover
    assert risk["potential_waste_qty"] == 6.0

    # 4. Financial loss estimate
    assert risk["potential_financial_loss"] == 360.0

    # 5. Waste risk score is high/critical
    assert risk["waste_risk_score"] >= 61.0
    assert risk["risk_level"] in ["HIGH", "CRITICAL"]

    # 6. Recommendation action
    rec = recommendation_engine.get_recommendation(
        product_name="Milk",
        category="Dairy",
        quantity=quantity,
        unit="L",
        days_to_expiry=risk["days_to_expiry"],
        potential_waste_qty=risk["potential_waste_qty"],
        waste_risk_score=risk["waste_risk_score"],
        risk_level=risk["risk_level"],
        user_type="restaurant_canteen"
    )
    assert rec["action"] == "USE FIRST"

    # 7. Transparent reason explanations
    reasons_str = " ".join(risk["risk_factors"])
    assert "2 day(s) remaining" in reasons_str
    assert "exceeds predicted consumption" in reasons_str

def test_priority_queue_ranking():
    today = date.today()
    milk = MockItem(1, "Whole Milk", "Dairy", 10.0, "L", today + timedelta(days=2), purchase_price=60.0)
    bread = MockItem(2, "Bread", "Bakery", 4.0, "packs", today + timedelta(days=1), purchase_price=40.0)
    rice = MockItem(3, "Basmati Rice", "Pantry", 25.0, "kg", today + timedelta(days=90), purchase_price=110.0)

    ranked = priority_engine.rank_inventory([rice, milk, bread])

    # Milk and Bread must rank ahead of Rice
    assert len(ranked) == 3
    assert ranked[0]["product_name"] in ["Bread", "Whole Milk"]
    assert ranked[1]["product_name"] in ["Bread", "Whole Milk"]
    assert ranked[2]["product_name"] == "Basmati Rice"
    assert ranked[2]["risk_level"] == "LOW"

def test_what_if_simulator():
    """
    Tests simulation: If purchasing 20% less milk, waste should decrease.
    """
    baseline_res = simulator_service.simulate_scenario(
        current_quantity=10.0,
        days_to_expiry=2,
        daily_consumption_rate=2.0,
        purchase_price_per_unit=60.0,
        purchase_qty_change_pct=-20.0 # 8 L instead of 10 L
    )
    # 8 L - 4 L consumed = 4 L simulated waste vs 6 L baseline
    assert baseline_res["baseline_expected_waste"] == 6.0
    assert baseline_res["simulated_expected_waste"] == 4.0
    assert baseline_res["waste_reduction_qty"] == 2.0
    assert baseline_res["money_saved"] == 120.0

def test_smart_reorder_advisor():
    """
    Rice: Current stock 25 kg, weekly demand 7.5 kg -> Days of supply ~ 23 days.
    Recommendation must be DO NOT BUY.
    """
    rec = reorder_engine.evaluate_purchase(
        product_name="Rice",
        category="Pantry",
        current_stock=25.0,
        unit="kg",
        avg_weekly_consumption=8.0,
        predicted_weekly_demand=7.5
    )
    assert rec["recommendation"] == "DO NOT BUY"
    assert "do not purchase additional stock yet" in rec["reason"].lower()

def test_ai_grounded_explainer():
    today = date.today()
    mock_context = [{
        "product_name": "Whole Milk",
        "category": "Dairy",
        "quantity": 10.0,
        "unit": "L",
        "days_to_expiry": 2,
        "waste_risk_score": 85.0,
        "risk_level": "CRITICAL",
        "recommended_action": "USE FIRST",
        "action_reason": "2 days remaining with 6 L surplus",
        "potential_waste_qty": 6.0,
        "potential_financial_loss": 360.0,
        "risk_factors": ["Critical shelf life: Only 2 day(s) remaining.", "Stock exceeds consumption by 6 L."]
    }]
    res = ai_service.answer_query("Why is Whole Milk high risk?", mock_context, {})
    assert "Whole Milk" in res["reply"]
    assert "85.0/100" in res["reply"]
    assert "USE FIRST" in res["reply"]
