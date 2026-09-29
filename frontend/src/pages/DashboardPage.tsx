import React, { useEffect, useState } from 'react';
import { AnalyticsData, PriorityItem } from '../types';
import { api } from '../api/client';
import {
  Package,
  Clock,
  AlertTriangle,
  Trash2,
  TrendingDown,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  IndianRupee
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onNavigateToPriority: () => void;
  onNavigateToInventory: () => void;
  onNavigateToAi: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToPriority,
  onNavigateToInventory,
  onNavigateToAi,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, priorityRes] = await Promise.all([
          api.get<AnalyticsData>('/analytics'),
          api.get<PriorityItem[]>('/priority'),
        ]);
        setData(analyticsRes);
        setPriorityItems(priorityRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Crunching food inventory & ML demand predictions...</p>
        </div>
      </div>
    );
  }

  const { kpis, waste_by_category, time_series_monthly } = data;
  const criticalItems = priorityItems.filter((i) => i.risk_level === 'CRITICAL' || i.risk_level === 'HIGH');

  // Distribution chart data
  const expiryDistribution = [
    { name: 'Today', count: kpis.expiring_today, color: '#ef4444' },
    { name: 'Within 3 Days', count: kpis.expiring_within_3_days - kpis.expiring_today, color: '#f97316' },
    { name: 'Within 7 Days', count: Math.max(0, kpis.expiring_within_7_days - kpis.expiring_within_3_days), color: '#eab308' },
    { name: 'Safe (>7 Days)', count: Math.max(0, kpis.total_inventory_items - kpis.expiring_within_7_days), color: '#10b981' },
  ].filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Critical Risk Items exist */}
      {criticalItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Action Required: {criticalItems.length} item(s) facing imminent waste risk!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Top urgency:{' '}
                <span className="font-semibold text-red-700">
                  {criticalItems[0].product_name} ({criticalItems[0].quantity} {criticalItems[0].unit})
                </span>{' '}
                expires in {criticalItems[0].days_to_expiry} day(s). Recommended: {criticalItems[0].recommended_action}.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPriority}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md shadow-red-500/20 shrink-0 self-start sm:self-center"
          >
            <span>Open Priority Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 6 Core Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Inventory */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Inventory</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{kpis.total_inventory_items}</span>
            <span className="text-xs text-slate-400 ml-1">items</span>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{kpis.total_food_quantity} units total stock</p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-amber-600">{kpis.expiring_within_3_days}</span>
            <span className="text-xs text-slate-400 ml-1">items (≤3d)</span>
            <p className="text-[11px] text-amber-700 mt-1 font-semibold">{kpis.expiring_today} expiring today</p>
          </div>
        </div>

        {/* High Risk */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">High Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-red-600">{kpis.high_risk_items}</span>
            <span className="text-xs text-slate-400 ml-1">items</span>
            <p className="text-[11px] text-red-600 mt-1 font-semibold">Priority Score &gt; 60</p>
          </div>
        </div>

        {/* Estimated Waste */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Waste</span>
            <Trash2 className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <span className="text-2xl font-black text-purple-700">{kpis.estimated_waste_qty}</span>
            <span className="text-xs text-slate-400 ml-1">units</span>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Unconsumed by expiry</p>
          </div>
        </div>

        {/* Potential Loss */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Potential Loss</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-rose-600">₹{kpis.estimated_money_at_risk}</span>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">At current inventory price</p>
          </div>
        </div>

        {/* Food Saved */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Food Saved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600">₹{kpis.estimated_money_saved}</span>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Rescuable by action</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Time Series: Monthly Waste Cost vs Money Saved */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Waste Trend vs Saved Value Over Time</h4>
              <p className="text-xs text-slate-500">Historical financial losses vs consumption savings (Last 6 months)</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
              Monthly
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={time_series_monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="saved_cost" name="Value Saved (₹)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSaved)" />
                <Area type="monotone" dataKey="waste_cost" name="Waste Loss (₹)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorLoss)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiry Distribution Pie */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Inventory Expiry Horizon</h4>
            <p className="text-xs text-slate-500">Distribution by remaining days</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {expiryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">No inventory registered</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expiryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {expiryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Category Waste Breakdown & Quick Ask WasteWise Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Waste Bar */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Waste Breakdown by Product Category</h4>
              <p className="text-xs text-slate-500">Total financial loss recorded by food category</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waste_by_category} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Financial Loss']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="financial_loss" fill="#10b981" radius={[6, 6, 0, 0]}>
                  {waste_by_category.map((_, idx) => (
                    <Cell key={`bar-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ask WasteWise AI Assistant Prompt Card */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Decision Engine</span>
            </div>
            <h3 className="text-lg font-black tracking-tight leading-snug">
              Got food inventory questions? Ask WasteWise AI.
            </h3>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              Query shelf-life metrics, get menu recipe suggestions for excess stock, or diagnose why an item has high waste risk.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={onNavigateToAi}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open AI Assistant</span>
            </button>
            <p className="text-[10px] text-center text-emerald-300/60">
              Grounded strictly in ML metrics. Zero hallucinations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
