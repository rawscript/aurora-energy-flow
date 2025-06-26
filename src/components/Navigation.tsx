
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChartBar, Calculator, Info, Settings } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation = ({ activeTab, setActiveTab }: NavigationProps) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartBar },
    { id: 'calculator', label: 'Bill Calculator', icon: Calculator },
    { id: 'insights', label: 'Insights', icon: Info },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-aurora-green/20 sticky top-0 z-10">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex-shrink-0 px-4 py-6 rounded-none border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-aurora-green-light bg-aurora-green/10 text-aurora-green-light'
                  : 'border-transparent hover:border-aurora-green/50 hover:bg-aurora-green/5'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
