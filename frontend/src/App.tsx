import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { PriorityPage } from './pages/PriorityPage';
import { InventoryPage } from './pages/InventoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { WasteLoggerPage } from './pages/WasteLoggerPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { ModelHubPage } from './pages/ModelHubPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { getAuthToken } from './api/client';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Initializing WasteWise AI platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/reports/pdf', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wastewise_audit_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error exporting PDF: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigateToPriority={() => setCurrentTab('priority')}
            onNavigateToInventory={() => setCurrentTab('inventory')}
            onNavigateToAi={() => setCurrentTab('ai-assistant')}
          />
        );
      case 'priority':
        return <PriorityPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'simulator':
        return <SimulatorPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'waste':
        return <WasteLoggerPage />;
      case 'ai-assistant':
        return <AiAssistantPage />;
      case 'models':
        return <ModelHubPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return (
          <DashboardPage
            onNavigateToPriority={() => setCurrentTab('priority')}
            onNavigateToInventory={() => setCurrentTab('inventory')}
            onNavigateToAi={() => setCurrentTab('ai-assistant')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onExportPdf={handleExportPdf} isExportingPdf={isExportingPdf} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};
