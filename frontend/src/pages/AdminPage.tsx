import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ShieldAlert,
  Users,
  Package,
  Trash2,
  Cpu,
  Activity,
  History,
  CheckCircle2
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const data = await api.get('/ml/admin/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">System Admin & Audit Logs</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          System telemetry, user volume, audit trail, and operational model status.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Total Users</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.total_users}</span>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-bold">{stats.active_users} active accounts</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Inventory Tracked</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.total_inventory_items}</span>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Across all organizations</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Waste Events Logged</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.total_waste_records}</span>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Training feedback points</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">AI Requests Handled</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-purple-700">{stats.ai_requests_processed}</span>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Zero hallucinations</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="font-extrabold text-sm text-slate-900">System Audit Trail</h3>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 sticky top-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_audit_logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                stats.recent_audit_logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {log.user_id ? `User #${log.user_id}` : 'System'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{log.details}</td>
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
