import React, { useState, useEffect } from 'react';
import { InventoryItem, SimulationResult } from '../types';
import { api } from '../api/client';
import {
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('custom');

  // Simulator Form Parameters
  const [params, setParams] = useState({
    product_name: 'Pasteurized Whole Milk',
    current_quantity: 10.0,
    days_to_expiry: 2,
    daily_consumption_rate: 2.0,
    purchase_price_per_unit: 60.0,
    simulated_consumption_rate_change_pct: 0.0,
    simulated_purchase_quantity_change_pct: 0.0,
    simulated_days_extension: 0,
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await api.get<InventoryItem[]>('/inventory');
        setInventory(data);
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    };
    fetchItems();
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.post<SimulationResult>('/simulator', params);
      setResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [
    params.current_quantity,
    params.days_to_expiry,
    params.daily_consumption_rate,
    params.purchase_price_per_unit,
    params.simulated_consumption_rate_change_pct,
    params.simulated_purchase_quantity_change_pct,
    params.simulated_days_extension,
  ]);

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedItemId(id);
    if (id === 'custom') {
      setParams({
        product_name: 'Custom Product',
        current_quantity: 10.0,
        days_to_expiry: 3,
        daily_consumption_rate: 2.0,
        purchase_price_per_unit: 50.0,
        simulated_consumption_rate_change_pct: 0.0,
        simulated_purchase_quantity_change_pct: 0.0,
        simulated_days_extension: 0,
      });
    } else {
      const item = inventory.find((i) => i.id === parseInt(id));
      if (item) {
        setParams({
          product_name: item.product_name,
          current_quantity: item.quantity,
          days_to_expiry: Math.max(1, item.days_to_expiry),
          daily_consumption_rate: 2.0,
          purchase_price_per_unit: item.purchase_price,
          simulated_consumption_rate_change_pct: 0.0,
          simulated_purchase_quantity_change_pct: 0.0,
          simulated_days_extension: 0,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">What-If Waste Reduction Simulator</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Model operational interventions: What happens if purchase volume drops by 20% or consumption accelerates?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-extrabold text-sm text-slate-900">Scenario Parameters</span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400">Load Inventory Item:</span>
              <select
                value={selectedItemId}
                onChange={handleItemSelect}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="custom">Custom Values</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} ({item.quantity} {item.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baseline inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Batch Stock</label>
              <input
                type="number"
                step="any"
                min="0.5"
                value={params.current_quantity}
                onChange={(e) => setParams({ ...params, current_quantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Days to Expiry</label>
              <input
                type="number"
                min="1"
                value={params.days_to_expiry}
                onChange={(e) => setParams({ ...params, days_to_expiry: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Daily Usage Rate</label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={params.daily_consumption_rate}
                onChange={(e) => setParams({ ...params, daily_consumption_rate: parseFloat(e.target.value) || 0.1 })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Unit Price (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={params.purchase_price_per_unit}
                onChange={(e) => setParams({ ...params, purchase_price_per_unit: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Sliders for Simulation Scenarios */}
          <div className="pt-2 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Intervention Adjustments
            </h4>

            {/* Slider 1: Purchase batch adjustment */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Batch Order Size Adjustment</span>
                <span
                  className={`font-black px-2 py-0.5 rounded-md ${
                    params.simulated_purchase_quantity_change_pct < 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : params.simulated_purchase_quantity_change_pct > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {params.simulated_purchase_quantity_change_pct > 0 ? '+' : ''}
                  {params.simulated_purchase_quantity_change_pct}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={params.simulated_purchase_quantity_change_pct}
                onChange={(e) =>
                  setParams({ ...params, simulated_purchase_quantity_change_pct: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                E.g. Ordering 20% less avoids buying surplus that exceeds natural consumption capacity.
              </p>
            </div>

            {/* Slider 2: Consumption Acceleration */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Consumption Rate Boost (Buffet / Promo)</span>
                <span
                  className={`font-black px-2 py-0.5 rounded-md ${
                    params.simulated_consumption_rate_change_pct > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : params.simulated_consumption_rate_change_pct < 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {params.simulated_consumption_rate_change_pct > 0 ? '+' : ''}
                  {params.simulated_consumption_rate_change_pct}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={params.simulated_consumption_rate_change_pct}
                onChange={(e) =>
                  setParams({ ...params, simulated_consumption_rate_change_pct: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                E.g. Featuring item as Chef's Special or applying 30% discount increases daily turnover.
              </p>
            </div>

            {/* Slider 3: Shelf-life extension */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Storage Freshness Extension</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  +{params.simulated_days_extension} Day(s)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={params.simulated_days_extension}
                onChange={(e) => setParams({ ...params, simulated_days_extension: parseInt(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                E.g. Vacuum packaging or precision sub-4°C refrigeration buffers extra shelf days.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Projected Outcomes (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {result && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Simulation Outcome
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                  Live Estimate
                </span>
              </div>

              {/* Comparison Cards */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Expected Waste</span>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    {result.baseline_expected_waste} units
                  </div>
                  <p className="text-[10px] text-slate-400">₹{result.baseline_financial_loss} loss</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Simulated Waste</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {result.simulated_expected_waste} units
                  </div>
                  <p className="text-[10px] text-emerald-300">₹{result.simulated_financial_loss} loss</p>
                </div>
              </div>

              {/* Big Savings Metric */}
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-center space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  Projected Financial Savings
                </span>
                <div className="text-3xl font-black text-emerald-300 tracking-tight">
                  ₹{result.money_saved}
                </div>
                <p className="text-xs text-emerald-200/90 font-semibold">
                  Waste Reduced by {result.waste_reduction_pct}% ({result.waste_reduction_qty} units saved)
                </p>
              </div>

              {/* Explanation Text */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed">
                <p className="font-semibold text-emerald-400 mb-1">Scenario Analysis:</p>
                <p>{result.explanation}</p>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                * Note: Clear simulation estimate based on consumption models. Does not guarantee demand spikes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
