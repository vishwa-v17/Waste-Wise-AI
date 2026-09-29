import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta
from app.main import app

client = TestClient(app)

def test_auth_and_user_flow():
    # 1. Register new user
    user_email = f"test_{int(date.today().strftime('%Y%m%d'))}@wastewise.ai"
    reg_res = client.post("/api/auth/register", json={
        "email": user_email,
        "password": "Password123!",
        "full_name": "Test User",
        "user_type": "restaurant_canteen"
    })
    # Either 200 or 400 (if already exists)
    if reg_res.status_code == 200:
        data = reg_res.json()
        assert "access_token" in data
        token = data["access_token"]
    else:
        # Login
        log_res = client.post("/api/auth/login", json={
            "email": user_email,
            "password": "Password123!"
        })
        assert log_res.status_code == 200
        token = log_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == user_email

    # 3. Add inventory item
    inv_res = client.post("/api/inventory", headers=headers, json={
        "product_name": "Fresh Cow Milk",
        "category": "Dairy",
        "quantity": 10.0,
        "unit": "L",
        "purchase_date": date.today().isoformat(),
        "expiry_date": (date.today() + timedelta(days=2)).isoformat(),
        "purchase_price": 60.0,
        "storage_type": "Refrigerator",
        "storage_location": "Walk-in Shelf 1"
    })
    assert inv_res.status_code == 201
    item_data = inv_res.json()
    assert item_data["product_name"] == "Fresh Cow Milk"
    assert item_data["waste_risk_score"] >= 60.0
    item_id = item_data["id"]

    # 4. Get priority queue
    pri_res = client.get("/api/priority", headers=headers)
    assert pri_res.status_code == 200
    items = pri_res.json()
    assert any(i["product_name"] == "Fresh Cow Milk" for i in items)

    # 5. Record waste
    waste_res = client.post("/api/waste", headers=headers, json={
        "inventory_id": item_id,
        "product_name": "Fresh Cow Milk",
        "category": "Dairy",
        "quantity": 2.0,
        "unit": "L",
        "reason": "Expired",
        "estimated_loss": 120.0
    })
    assert waste_res.status_code == 201
    assert waste_res.json()["estimated_loss"] == 120.0

    # 6. Analytics
    ana_res = client.get("/api/analytics", headers=headers)
    assert ana_res.status_code == 200
    ana_data = ana_res.json()
    assert "kpis" in ana_data
    assert ana_data["kpis"]["total_inventory_items"] >= 1

    # 7. Simulator
    sim_res = client.post("/api/simulator", headers=headers, json={
        "current_quantity": 10.0,
        "days_to_expiry": 2,
        "daily_consumption_rate": 2.0,
        "purchase_price_per_unit": 60.0,
        "simulated_consumption_rate_change_pct": 25.0
    })
    assert sim_res.status_code == 200
    assert sim_res.json()["money_saved"] > 0

    # 8. Purchases
    pur_res = client.get("/api/purchases/recommendations", headers=headers)
    assert pur_res.status_code == 200

    # 9. ML Metrics
    ml_res = client.get("/api/ml/metrics", headers=headers)
    assert ml_res.status_code == 200
    assert "champion_model" in ml_res.json()
