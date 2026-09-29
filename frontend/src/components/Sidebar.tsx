import React from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  Package,
  BarChart3,
  SlidersHorizontal,
  ShoppingCart,
  Trash2,
  Sparkles,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'priority'
  | 'inventory'
  | 'analytics'
  | 'simulator'
  | 'purchases'
  | 'waste'
  | 'ai-assistant'
  | 'models'
  | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'priority', label: 'Priority Queue', icon: ListOrdered, badge: 'Smart' },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'analytics', label: 'Waste Analytics', icon: BarChart3 },
    { id: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
    { id: 'purchases', label: 'Smart Purchases', icon: ShoppingCart },
    { id: 'waste', label: 'Record Waste', icon: Trash2 },
    { id: 'ai-assistant', label: 'Ask WasteWise AI', icon: Sparkles, highlight: true },
    { id: 'models', label: 'Model Hub & ML', icon: Cpu },
  ];

  if (user?.is_admin) {
    navItems.push({ id: 'admin', label: 'Admin & Audits', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Decision Center
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : item.highlight
                  ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : item.highlight ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && !isActive && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety & Decision Support Footer Card */}
      <div className="mt-auto p-4 m-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">
        <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Decision Support</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Predictions optimize usage. Always follow standard food hygiene and temperature controls.
        </p>
      </div>
    </aside>
  );
};
