import React, { useState, useEffect } from 'react';
import { WasteRecord, InventoryItem } from '../types';
import { api } from '../api/client';
import {
  Trash2,
  Plus,
  Utensils,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Layers,
  History
} from 'lucide-react';

export const WasteLoggerPage: React.FC = () => {
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    inventory_id: '',
    product_name: '',
    category: 'Dairy',
    quantity: 1.0,
    unit: 'kg',
    reason: 'Expired',
    date: new Date().toISOString().split('T')[0],
    estimated_loss: 0.0,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wastes, items] = await Promise.all([
        api.get<WasteRecord[]>('/waste'),
        api.get<InventoryItem[]>('/inventory'),
      ]);
      setWasteRecords(wastes);
      setInventoryItems(items);
    } catch (err) {
      console.error('Failed to load waste records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setFormData((prev) => ({ ...prev, inventory_id: id }));
    if (id) {
      const item = inventoryItems.find((i) => i.id === parseInt(id));
      if (item) {
        setFormData((prev) => ({
          ...prev,
          product_name: item.product_name,
          category: item.category,
          unit: item.unit,
          estimated_loss: Math.round(prev.quantity * item.purchase_price * 100) / 100,
        }));
      }
    }
  };

  const handleQuantityChange = (qty: number) => {
    setFormData((prev) => {
      let loss = prev.estimated_loss;
      if (prev.inventory_id) {
        const item = inventoryItems.find((i) => i.id === parseInt(prev.inventory_id));
        if (item && item.purchase_price > 0) {
          loss = Math.round(qty * item.purchase_price * 100) / 100;
        }
      }
      return { ...prev, quantity: qty, estimated_loss: loss };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        inventory_id: formData.inventory_id ? parseInt(formData.inventory_id) : null,
        product_name: formData.product_name,
        category: formData.category,
        quantity: formData.quantity,
        unit: formData.unit,
        reason: formData.reason,
        date: formData.date,
        estimated_loss: formData.estimated_loss,
        notes: formData.notes || null,
      };

      await api.post('/waste', payload);
      setSuccessMsg(`Successfully logged ${formData.quantity} ${formData.unit} of ${formData.product_name} as waste.`);
      setFormData({
        inventory_id: '',
        product_name: '',
        category: 'Dairy',
        quantity: 1.0,
        unit: 'kg',
        reason: 'Expired',
        date: new Date().toISOString().split('T')[0],
        estimated_loss: 0.0,
        notes: '',
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(`Error recording waste: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <Trash2 className="w-6 h-6 text-red-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Record Actual Waste</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Log food discarded due to expiry, spoilage, or low demand. This data trains and refines future demand predictions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-red-600" />
            <span>Log Waste Event</span>
          </h3>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select from Inventory (Optional)</label>
              <select
                value={formData.inventory_id}
                onChange={handleItemSelect}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Manual Entry --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} ({item.quantity} {item.unit} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Whole Milk"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat & Seafood">Meat & Seafood</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Prepared Food">Prepared Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qty *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Waste *</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Expired">Expired</option>
                  <option value="Spoiled">Spoiled</option>
                  <option value="Over-purchased">Over-purchased</option>
                  <option value="Low demand">Low demand</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Storage problem">Storage problem</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estimated Loss (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.estimated_loss}
                  onChange={(e) => setFormData({ ...formData, estimated_loss: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Notes / Root Cause</label>
              <textarea
                rows={2}
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Recording Waste...' : 'Confirm & Log Waste'}
            </button>
          </form>
        </div>

        {/* Right: Waste Ledger Table (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="font-extrabold text-sm text-slate-900">Historical Waste Ledger</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Total Discarded: <strong>{wasteRecords.length} records</strong>
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 sticky top-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Est. Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wasteRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No waste records logged yet.
                    </td>
                  </tr>
                ) : (
                  wasteRecords.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-slate-500">{w.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{w.product_name}</td>
                      <td className="py-2.5 px-3 font-semibold">{w.quantity} {w.unit}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          {w.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">
                        ₹{w.estimated_loss}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
