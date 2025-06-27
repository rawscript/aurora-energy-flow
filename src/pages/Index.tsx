
import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import EnergyDashboard from '@/components/EnergyDashboard';
import BillCalculator from '@/components/BillCalculator';
import EnergyInsights from '@/components/EnergyInsights';
import Settings from '@/components/Settings';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EnergyDashboard />;
      case 'calculator':
        return <BillCalculator />;
      case 'insights':
        return <EnergyInsights />;
      case 'settings':
        return <Settings />;
      default:
        return <EnergyDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-sm border-b border-aurora-green/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-aurora-gradient rounded-lg flex items-center justify-center animate-aurora-pulse">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-aurora-green-light to-aurora-blue-light bg-clip-text text-transparent">
                  Aurora Energy
                </h1>
                <p className="text-sm text-muted-foreground">Smart Energy Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Welcome back</p>
                  <p className="text-sm font-medium text-aurora-green-light">
                    {user?.user_metadata?.full_name || user?.email || 'User'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <p className="text-sm font-medium text-aurora-green-light">● Online</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-aurora-green/20 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 Aurora Energy. Empowering sustainable energy management.
            </p>
            <div className="flex justify-center items-center space-x-4 mt-4">
              <span className="text-xs text-muted-foreground">Powered by AI</span>
              <div className="w-2 h-2 bg-aurora-green-light rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Real-time Monitoring</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
