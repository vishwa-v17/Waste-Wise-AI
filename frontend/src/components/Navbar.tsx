import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { api, getAuthToken } from '../api/client';
import {
  Bell,
  FileDown,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Building2,
  ShoppingBag,
  Home,
  Check
} from 'lucide-react';

interface NavbarProps {
  onExportPdf: () => void;
  isExportingPdf: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onExportPdf, isExportingPdf }) => {
  const { user, logout, setUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<AppNotification[]>('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getUserTypeIcon = () => {
    if (!user) return null;
    switch (user.user_type) {
      case 'grocery':
        return <ShoppingBag className="w-3.5 h-3.5 mr-1 text-amber-600" />;
      case 'personal':
        return <Home className="w-3.5 h-3.5 mr-1 text-blue-600" />;
      default:
        return <Building2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />;
    }
  };

  const getUserTypeLabel = () => {
    if (!user) return '';
    switch (user.user_type) {
      case 'grocery':
        return 'Small Grocery Store';
      case 'personal':
        return 'Household User';
      default:
        return 'Restaurant / Canteen';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-700 to-teal-800 bg-clip-text text-transparent">
              WasteWise <span className="font-black text-emerald-500">AI</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200">
              v1.0 Pro
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
            AI-Based Expiry & Food Waste Prioritization
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* User Type Badge */}
        {user && (
          <div className="hidden md:flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {getUserTypeIcon()}
            <span>{getUserTypeLabel()}</span>
          </div>
        )}

        {/* PDF Export Button */}
        <button
          onClick={onExportPdf}
          disabled={isExportingPdf}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm disabled:opacity-50"
          title="Generate comprehensive executive PDF audit report"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isExportingPdf ? 'Exporting...' : 'PDF Report'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-800">Alerts & Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center"
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications. Everything is in order.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs flex items-start space-x-2.5 transition-colors ${
                        n.is_read ? 'bg-white text-slate-600' : 'bg-amber-50/50 text-slate-900 font-medium'
                      }`}
                    >
                      {n.type === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <Flame className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{n.title}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        {user && (
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
                {user.full_name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5 truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
