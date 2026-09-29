import React, { useState, useEffect } from 'react';
import { ModelMetrics } from '../types';
import { api } from '../api/client';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  Trophy,
  BarChart2,
  Database,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export const ModelHubPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.get<ModelMetrics>('/ml/metrics');
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load ML metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainMsg('');
    try {
      const res: any = await api.post('/ml/train');
      setMetrics(res.metrics);
      setRetrainMsg(`Models successfully retrained! Champion Model: ${res.metrics.champion_model}`);
      setTimeout(() => setRetrainMsg(''), 5000);
    } catch (err: any) {
      alert(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">AI/ML Model Training Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent validation metrics, cross-model benchmarking, and feature importance.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
          <span>{retraining ? 'Training Models...' : 'Re-train & Benchmark Models'}</span>
        </button>
      </div>

      {retrainMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{retrainMsg}</span>
        </div>
      )}

      {/* Champion Model Highlight */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              Active Production Champion Model
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Deployed
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black tracking-tight">{metrics.champion_model}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Selected by lowest Test Root Mean Squared Error (RMSE) across all candidates.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Test MAE</span>
              <p className="text-lg font-black text-emerald-400">{metrics.champion_metrics.mae}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Test RMSE</span>
              <p className="text-lg font-black text-amber-400">{metrics.champion_metrics.rmse}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Test R² Score</span>
              <p className="text-lg font-black text-emerald-300">{metrics.champion_metrics.r2}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center">
            <Database className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Dataset Records: <strong>{metrics.dataset_size} samples</strong>
          </span>
          <span className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Last Trained: <strong>{metrics.trained_at}</strong>
          </span>
        </div>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Algorithm Performance Benchmark</h3>
          <p className="text-xs text-slate-500">
            Real test split evaluation comparing candidate regression architectures on food demand forecasting.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Architecture</th>
                <th className="py-3 px-4">Mean Absolute Error (MAE)</th>
                <th className="py-3 px-4">Root Mean Squared Error (RMSE)</th>
                <th className="py-3 px-4">R² Score (Goodness of Fit)</th>
                <th className="py-3 px-4 text-right">Deployment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(metrics.comparison).map(([modelName, scores]) => {
                const isChampion = modelName === metrics.champion_model;
                return (
                  <tr key={modelName} className={isChampion ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                      {isChampion && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span>{modelName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{scores.mae}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{scores.rmse}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{scores.r2}</td>
                    <td className="py-3.5 px-4 text-right">
                      {isChampion ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active Champion
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Benchmarked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Engineering Pipeline Details */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900">Feature Engineering Pipeline</h3>
        <p className="text-xs text-slate-500">
          Features extracted and scaled before input to the regressor pipeline:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {metrics.features.map((feat, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
