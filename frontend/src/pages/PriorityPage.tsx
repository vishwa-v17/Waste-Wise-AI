import React, { useState, useEffect } from 'react';
import { PriorityItem } from '../types';
import { api } from '../api/client';
import {
  ListOrdered,
  AlertTriangle,
  Flame,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowUpDown,
  Filter,
  Package,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  Utensils
} from 'lucide-react';

interface PriorityPageProps {
  onQuickLogWaste?: (item: PriorityItem) => void;
  onQuickLogConsumption?: (item: PriorityItem) => void;
}

export const PriorityPage: React.FC<PriorityPageProps> = ({
  onQuickLogWaste,
  onQuickLogConsumption
}) => {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [expiryFilter, setExpiryFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const fetchPriorityQueue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (riskFilter !== 'All') params.append('risk_level', riskFilter);
      if (expiryFilter !== 'All') params.append('expiry_period', expiryFilter);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);

      const data = await api.get<PriorityItem[]>(`/priority?${params.toString()}`);
      setItems(data);
    } catch (err) {
      console.error('Failed to load priority queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorityQueue();
  }, [riskFilter, expiryFilter, categoryFilter]);

  const getRiskBadge = (level: string, score: number) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600 animate-pulse" />
            CRITICAL ({score})
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300">
            <Flame className="w-3.5 h-3.5 mr-1 text-orange-600" />
            HIGH ({score})
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            MEDIUM ({score})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            LOW ({score})
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    let colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
    if (action === 'USE FIRST') colorClass = 'bg-rose-100 text-rose-800 border-rose-300';
    else if (action === 'DISCOUNT' || action === 'SELL FIRST') colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
    else if (action === 'DONATE') colorClass = 'bg-purple-100 text-purple-800 border-purple-300';
    else if (action === 'REDUCE FUTURE PURCHASE') colorClass = 'bg-cyan-100 text-cyan-800 border-cyan-300';

    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide border ${colorClass}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Smart Priority Queue</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic AI decision queue prioritizing food items by shelf life, run-rate, and waste probability.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Risk Levels</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          {/* Expiry Filter */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Horizons</option>
            <option value="today">Expiring Today</option>
            <option value="3_days">Within 3 Days</option>
            <option value="7_days">Within 7 Days</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            <option value="Dairy">Dairy</option>
            <option value="Bakery">Bakery</option>
            <option value="Produce">Produce</option>
            <option value="Meat & Seafood">Meat & Seafood</option>
            <option value="Pantry">Pantry</option>
            <option value="Beverages">Beverages</option>
          </select>
        </div>
      </div>

      {/* Queue Items List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Priority Queue Empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No items match the selected filters, or all inventory items have healthy consumption buffers!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, index) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  item.risk_level === 'CRITICAL'
                    ? 'border-red-300 ring-1 ring-red-100 hover:border-red-400'
                    : item.risk_level === 'HIGH'
                    ? 'border-orange-300 ring-1 ring-orange-100 hover:border-orange-400'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Main Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Rank, Product, Expiry */}
                  <div className="flex items-start sm:items-center space-x-3.5">
                    <div
                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        index === 0
                          ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                          : index < 3
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {item.product_name}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {getRiskBadge(item.risk_level, item.waste_risk_score)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">
                          Stock: {item.quantity} {item.unit}
                        </span>
                        <span>•</span>
                        <span className="flex items-center text-slate-600">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Expiry: {item.expiry_date} (
                          <strong className={item.days_to_expiry <= 2 ? 'text-red-600 font-bold' : 'text-slate-800'}>
                            {item.days_to_expiry <= 0 ? 'Today' : `${item.days_to_expiry} days left`}
                          </strong>
                          )
                        </span>
                        <span>•</span>
                        <span>Location: {item.storage_location || 'Main Shelf'} ({item.storage_type})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Recommendation & Estimated Potential Loss */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <div className="mb-1">{getActionBadge(item.recommended_action)}</div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Potential Waste: <strong className="text-slate-800">{item.potential_waste_qty} {item.unit}</strong>{' '}
                        (Loss: <strong className="text-rose-600 font-bold">₹{item.potential_financial_loss}</strong>)
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center space-x-1"
                        title="View factor explainability and why"
                      >
                        <Info className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Why?</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Explanation Breakdown */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Action Rationale */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Recommended Action Directive
                        </span>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {item.recommended_action}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.action_reason}
                          </p>
                        </div>
                      </div>

                      {/* Right: Transparent Factor Scoring */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Transparent Risk Factors ({item.waste_risk_score}/100)
                        </span>
                        <ul className="space-y-1.5 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                          {item.risk_factors.map((factor, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
