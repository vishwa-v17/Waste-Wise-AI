import requests
from typing import Optional, Dict, Any

class BarcodeService:
    @staticmethod
    def lookup_barcode(barcode: str) -> Optional[Dict[str, Any]]:
        """
        Looks up product details from Open Food Facts API by barcode.
        User must still review and confirm quantity and expiry date manually.
        """
        if not barcode or not barcode.strip():
            return None

        clean_code = barcode.strip()
        url = f"https://world.openfoodfacts.org/api/v0/product/{clean_code}.json"
        headers = {"User-Agent": "WasteWiseAI - DecisionSupport - Version1.0"}

        try:
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == 1 and "product" in data:
                    prod = data["product"]
                    
                    # Map categories to WasteWise categories
                    raw_cat = (prod.get("categories") or "").lower()
                    category = "Other"
                    if any(k in raw_cat for k in ["milk", "dairy", "yogurt", "cheese", "butter"]):
                        category = "Dairy"
                    elif any(k in raw_cat for k in ["bread", "bakery", "pastry", "cake", "biscuit"]):
                        category = "Bakery"
                    elif any(k in raw_cat for k in ["fruit", "vegetable", "produce", "salad"]):
                        category = "Produce"
                    elif any(k in raw_cat for k in ["meat", "chicken", "beef", "fish", "seafood"]):
                        category = "Meat & Seafood"
                    elif any(k in raw_cat for k in ["beverage", "juice", "soda", "drink", "water"]):
                        category = "Beverages"
                    elif any(k in raw_cat for k in ["cereal", "grain", "rice", "pasta", "snack", "flour"]):
                        category = "Pantry"

                    return {
                        "barcode": clean_code,
                        "product_name": prod.get("product_name") or prod.get("product_name_en") or "Unknown Product",
                        "brand": prod.get("brands") or "Generic",
                        "category": category,
                        "image_url": prod.get("image_front_small_url") or "",
                        "quantity_str": prod.get("quantity") or ""
                    }
        except Exception as e:
            print(f"[BarcodeService] Lookup failed for {clean_code}: {e}")
            
        return None

barcode_service = BarcodeService()
