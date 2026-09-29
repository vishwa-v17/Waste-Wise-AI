import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { api } from '../api/client';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Barcode,
  Upload,
  Download,
  Trash2,
  Edit,
  Clock,
  Eye,
  Check,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [riskLevel, setRiskLevel] = useState('All');
  const [expiryFilter, setExpiryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('expiry_date');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'Dairy',
    quantity: 1.0,
    unit: 'kg',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    purchase_price: 50.0,
    storage_type: 'Refrigerator',
    storage_location: 'Main Shelf',
    supplier: '',
    barcode: '',
    notes: '',
  });

  // Barcode Lookup State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'All') params.append('category', category);
      if (riskLevel !== 'All') params.append('risk_level', riskLevel);
      if (expiryFilter !== 'All') params.append('expiry_filter', expiryFilter);
      params.append('sort_by', sortBy);
      params.append('order', sortOrder);

      const data = await api.get<InventoryItem[]>(`/inventory?${params.toString()}`);
      setItems(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [category, riskLevel, expiryFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await api.put(`/inventory/${selectedItem.id}`, formData);
      } else {
        await api.post('/inventory', formData);
      }
      setShowAddModal(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (err: any) {
      alert(`Error saving item: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err: any) {
      alert(`Failed to delete item: ${err.message}`);
    }
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return;
    setBarcodeLoading(true);
    setBarcodeError('');
    try {
      const info: any = await api.get(`/inventory/barcode/${barcodeInput.trim()}`);
      setFormData(prev => ({
        ...prev,
        product_name: info.product_name,
        category: info.category,
        supplier: info.brand,
        barcode: info.barcode,
      }));
      setShowBarcodeModal(false);
      setShowAddModal(true);
    } catch (err: any) {
      setBarcodeError('Product barcode not found in global database. You can still add details manually.');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const form = new FormData();
      form.append('file', csvFile);
      const res: any = await api.post('/csv/import', form);
      setCsvResult(`Successfully imported ${res.imported_count} items!`);
      fetchInventory();
      setTimeout(() => setShowCsvModal(false), 2000);
    } catch (err: any) {
      setCsvResult(`Upload failed: ${err.message}`);
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    window.open('/api/csv/template', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Food Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your pantry, cold storage, and ingredients with dynamic AI risk scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Barcode Scanner Button */}
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
          >
            <Barcode className="w-3.5 h-3.5 text-slate-600" />
            <span>Scan Barcode</span>
          </button>

          {/* CSV Import */}
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Import CSV</span>
          </button>

          {/* Add Item Modal */}
          <button
            onClick={() => {
              setSelectedItem(null);
              setFormData({
                product_name: '',
                category: 'Dairy',
                quantity: 1.0,
                unit: 'kg',
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
                purchase_price: 50.0,
                storage_type: 'Refrigerator',
                storage_location: 'Main Shelf',
                supplier: '',
                barcode: '',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search food, supplier, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            <option value="Dairy">Dairy</option>
            <option value="Bakery">Bakery</option>
            <option value="Produce">Produce</option>
            <option value="Meat & Seafood">Meat & Seafood</option>
            <option value="Pantry">Pantry</option>
            <option value="Beverages">Beverages</option>
            <option value="Prepared Food">Prepared Food</option>
          </select>

          {/* Risk Level */}
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Risks</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Expiry Filter */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Expiries</option>
            <option value="today">Expiring Today</option>
            <option value="3_days">≤ 3 Days</option>
            <option value="7_days">≤ 7 Days</option>
            <option value="expired">Expired</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="expiry_date">Sort by Expiry</option>
            <option value="risk_score">Sort by Risk Score</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="product_name">Sort by Name</option>
          </select>

          {/* Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Quantity</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Waste Risk</th>
                <th className="py-3 px-3">Storage / Loc</th>
                <th className="py-3 px-3">Recommended Action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading inventory items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No food inventory items found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>
                        <span>{item.product_name}</span>
                        {item.supplier && (
                          <span className="block text-[10px] text-slate-400 font-normal">{item.supplier}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`font-semibold ${item.days_to_expiry <= 2 ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.expiry_date}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {item.days_to_expiry <= 0 ? 'Expired' : `${item.days_to_expiry} days left`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                          item.risk_level === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : item.risk_level === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : item.risk_level === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.waste_risk_score}/100 ({item.risk_level})
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-slate-700 font-medium">{item.storage_type}</span>
                      <span className="block text-[10px] text-slate-400">{item.storage_location || 'Main Shelf'}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {item.recommended_action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setFormData({
                            product_name: item.product_name,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit,
                            purchase_date: item.purchase_date,
                            expiry_date: item.expiry_date,
                            purchase_price: item.purchase_price,
                            storage_type: item.storage_type,
                            storage_location: item.storage_location || '',
                            supplier: item.supplier || '',
                            barcode: item.barcode || '',
                            notes: item.notes || '',
                          });
                          setShowAddModal(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                        title="Edit Item"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {selectedItem ? 'Edit Food Item' : 'Add New Food Inventory'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pasteurized Whole Milk"
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
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="units">units</option>
                      <option value="packs">packs</option>
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Type</label>
                  <select
                    value={formData.storage_type}
                    onChange={(e) => setFormData({ ...formData, storage_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Refrigerator">Refrigerator</option>
                    <option value="Freezer">Freezer</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Room temperature">Room temperature</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in Rack 2"
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Local Dairy Coop"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Batch Info</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                >
                  {selectedItem ? 'Update Item' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Barcode Lookup</h3>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-500">
                Enter or scan the numeric barcode (e.g., from milk, bread, cereal, canned goods).
                Fetches brand and category via Open Food Facts.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Barcode</label>
                <input
                  type="text"
                  placeholder="e.g. 5449000000996"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {barcodeError && (
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
                  {barcodeError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(false)}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={barcodeLoading}
                  onClick={handleBarcodeLookup}
                  className="px-4 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {barcodeLoading ? 'Searching...' : 'Lookup Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Bulk CSV Inventory Import</h3>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCsvImport} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-900">Need the CSV template?</p>
                  <p className="text-[11px] text-emerald-700">Download formatted columns with example rows.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              {csvResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${csvResult.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
                  {csvResult}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={csvUploading || !csvFile}
                  className="px-4 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {csvUploading ? 'Importing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
