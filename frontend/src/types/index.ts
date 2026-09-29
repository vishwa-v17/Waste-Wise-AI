export type UserType = 'personal' | 'restaurant_canteen' | 'grocery';

export interface User {
  id: number;
  email: string;
  full_name: string;
  user_type: UserType;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  user_id: number;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  purchase_price: number;
  current_value: number;
  storage_type: string;
  storage_location?: string;
  supplier?: string;
  barcode?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Dynamic ML/decision fields
  days_to_expiry: number;
  waste_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_rank: number;
  recommended_action: string;
  action_reason: string;
  risk_factors: string[];
  predicted_7d_demand: number;
  potential_waste_qty: number;
  potential_financial_loss: number;
}

export interface PriorityItem {
  id: number;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  days_to_expiry: number;
  daily_consumption_rate: number;
  predicted_demand_before_expiry: number;
  potential_waste_qty: number;
  potential_financial_loss: number;
  waste_risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action: string;
  action_reason: string;
  risk_factors: string[];
  storage_type: string;
  storage_location?: string;
}

export interface DashboardKPIs {
  total_inventory_items: number;
  total_food_quantity: number;
  expiring_today: number;
  expiring_within_3_days: number;
  expiring_within_7_days: number;
  high_risk_items: number;
  estimated_waste_qty: number;
  estimated_money_at_risk: number;
  estimated_money_saved: number;
  actual_waste_cost_this_month: number;
  waste_trend_pct: number;
  consumption_trend_pct: number;
}

export interface CategoryWasteStat {
  category: string;
  wasted_qty: number;
  financial_loss: number;
  item_count: number;
}

export interface ReasonWasteStat {
  reason: string;
  wasted_qty: number;
  financial_loss: number;
  count: number;
}

export interface TimeSeriesPoint {
  date: string;
  waste_cost: number;
  waste_qty: number;
  consumed_qty: number;
  saved_cost: number;
}

export interface AnalyticsData {
  kpis: DashboardKPIs;
  waste_by_category: CategoryWasteStat[];
  waste_by_reason: ReasonWasteStat[];
  time_series_monthly: TimeSeriesPoint[];
  time_series_weekly: TimeSeriesPoint[];
  top_wasted_products: Array<{ product_name: string; wasted_qty: number; unit: string; total_loss: number }>;
  highest_financial_losses: Array<{ product_name: string; wasted_qty: number; unit: string; total_loss: number }>;
  current_vs_previous_month: {
    current_month_cost: number;
    previous_month_cost: number;
    difference: number;
    trend_pct: number;
    improved: boolean;
  };
}

export interface WasteRecord {
  id: number;
  user_id: number;
  inventory_id?: number;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  reason: string;
  date: string;
  estimated_loss: number;
  notes?: string;
  created_at: string;
}

export interface ConsumptionRecord {
  id: number;
  user_id: number;
  inventory_id?: number;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  date: string;
  notes?: string;
  created_at: string;
}

export interface SimulationResult {
  baseline_expected_waste: number;
  baseline_financial_loss: number;
  simulated_expected_waste: number;
  simulated_financial_loss: number;
  waste_reduction_qty: number;
  waste_reduction_pct: number;
  money_saved: number;
  explanation: string;
}

export interface PurchaseRecommendation {
  product_name: string;
  category: string;
  current_stock: number;
  unit: string;
  avg_weekly_consumption: number;
  predicted_weekly_demand: number;
  days_of_supply: number;
  recommendation: 'BUY' | 'BUY LESS' | 'DO NOT BUY' | 'WAIT' | 'MONITOR';
  suggested_order_qty: number;
  reason: string;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  is_read: boolean;
  created_at: string;
}

export interface ModelMetrics {
  champion_model: string;
  trained_at: string;
  dataset_size: number;
  features: string[];
  comparison: Record<string, { mae: number; rmse: number; r2: number }>;
  champion_metrics: { mae: number; rmse: number; r2: number };
}
