import React, { useState, useEffect } from 'react';
import { PurchaseRecommendation } from '../types';
import { api } from '../api/client';
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  TrendingDown,
  Info,
  Calendar
} from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<PurchaseRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const data = await api.get<PurchaseRecommendation[]>('/purchases/recommendations');
        setRecommendations(data);
      } catch (err) {
        console.error('Failed to load purchase recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const getActionBadge = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            BUY (RESTOCK)
          </span>
        );
      case 'MONITOR':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            MONITOR
          </span>
        );
      case 'WAIT':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            WAIT
          </span>
        );
      case 'BUY LESS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
            BUY LESS (-50%)
          </span>
        );
      default: // DO NOT BUY
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            DO NOT BUY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Smart Purchase Recommendations</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          AI replenishment advisor preventing over-purchasing and dead inventory accumulation before orders are placed.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs text-slate-400">No active products to evaluate for purchases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`p-5 bg-white rounded-2xl border transition-all duration-200 shadow-sm flex flex-col justify-between space-y-4 ${
                rec.recommendation === 'BUY'
                  ? 'border-rose-300 ring-1 ring-rose-100'
                  : rec.recommendation === 'DO NOT BUY'
                  ? 'border-emerald-300 ring-1 ring-emerald-100'
                  : 'border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{rec.product_name}</h3>
                    <span className="text-[11px] font-medium text-slate-500">{rec.category}</span>
                  </div>
                  <div>{getActionBadge(rec.recommendation)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</span>
                    <p className="font-extrabold text-slate-800 text-sm">
                      {rec.current_stock} {rec.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days of Supply</span>
                    <p className="font-extrabold text-slate-800 text-sm">
                      {rec.days_of_supply} days
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">7-Day Demand</span>
                    <p className="font-medium text-slate-700">
                      {rec.predicted_weekly_demand} {rec.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Order</span>
                    <p className="font-bold text-emerald-700">
                      {rec.suggested_order_qty > 0 ? `${rec.suggested_order_qty} ${rec.unit}` : '0 (None)'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {rec.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
