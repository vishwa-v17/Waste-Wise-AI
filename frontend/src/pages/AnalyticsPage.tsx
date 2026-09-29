import React, { useState, useEffect } from 'react';
import { AnalyticsData } from '../types';
import { api } from '../api/client';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  PiggyBank,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
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
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get<AnalyticsData>('/analytics');
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const {
    kpis,
    waste_by_category,
    waste_by_reason,
    time_series_monthly,
    time_series_weekly,
    top_wasted_products,
    current_vs_previous_month
  } = data;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Waste Analytics & Savings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited metrics on recorded food waste, root causes, financial losses, and real-time savings.
        </p>
      </div>

      {/* Savings Calculator Callout Box (Section 14) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400">
              Savings & Waste Loss Calculator
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Audit Grounded
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Potential Waste</span>
            <div className="text-2xl font-black text-rose-400 mt-1">₹{kpis.estimated_money_at_risk}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Unconsumed surplus stock risk</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Potential Savings</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">₹{kpis.estimated_money_saved}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Through timely discounts & priority prep</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Actual Waste Logged (This Month)</span>
            <div className="text-2xl font-black text-amber-300 mt-1">₹{kpis.actual_waste_cost_this_month}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Historical recorded losses</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/20 text-[11px] text-slate-300 flex items-start space-x-2">
          <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Distinction note:</strong> <em>Potential savings</em> are predictive estimates achievable by executing recommended actions before expiry. <em>Actual savings</em> represent food diverted from waste into verified consumption.
          </span>
        </div>
      </div>

      {/* Month-over-Month Comparison Widget */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month-over-Month Comparison</span>
          <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
            Current Month (₹{current_vs_previous_month.current_month_cost}) vs Previous Month (₹{current_vs_previous_month.previous_month_cost})
          </h4>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black ${
              current_vs_previous_month.improved
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {current_vs_previous_month.improved ? (
              <>
                <ArrowDownRight className="w-4 h-4 mr-1 text-emerald-700" />
                Waste Reduced by {Math.abs(current_vs_previous_month.trend_pct)}%
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4 mr-1 text-red-700" />
                Waste Increased by {current_vs_previous_month.trend_pct}%
              </>
            )}
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste Reasons Distribution */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Waste by Root Cause / Reason</h4>
            <p className="text-xs text-slate-500">Why was food discarded? (Expired, Spoiled, Over-purchased, etc.)</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waste_by_reason} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis dataKey="reason" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={90} />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Loss']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="financial_loss" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Line Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Recent Weekly Consumption vs Waste</h4>
            <p className="text-xs text-slate-500">Last 4 weeks run-rate comparison</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={time_series_weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="consumed_qty" name="Consumed Qty" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="waste_qty" name="Wasted Qty" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Wasted Products Table */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h4 className="text-sm font-bold text-slate-900">Highest Historical Financial Losses by Product</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Total Quantity Discarded</th>
                <th className="py-2.5 px-3">Cumulative Financial Loss</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top_wasted_products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No recorded waste yet. Keep following the Priority Queue!
                  </td>
                </tr>
              ) : (
                top_wasted_products.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name}</td>
                    <td className="py-2.5 px-3 font-semibold">{item.wasted_qty} {item.unit}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">₹{item.total_loss}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Rank #{idx + 1}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
