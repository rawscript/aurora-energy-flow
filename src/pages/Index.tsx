import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useEnergyProvider } from "@/contexts/EnergyProviderContext";
import { useMeter } from "@/contexts/MeterContext";
import { Info, User, LogOut } from "lucide-react";

// Lazy load components for better performance
const EnergyDashboard = lazy(() => import("@/components/EnergyDashboard"));
const EnergyInsightsDashboard = lazy(() => import("@/components/EnergyInsightsDashboard"));
const DemandDrivenEnergyData = lazy(() => import("@/components/DemandDrivenEnergyData"));
const SolarRealTimeDashboard = lazy(() => import("@/components/SolarRealTimeDashboard"));
const PayAsYouGoDashboard = lazy(() => import("@/components/PayAsYouGoDashboard"));
const EnergyInsights = lazy(() => import("@/components/EnergyInsights"));
const BillCalculator = lazy(() => import("@/components/BillCalculator"));
// Chatbot widget - renders as a floating overlay across all tabs
const Chatbot = lazy(() => import("@/components/Chatbot"));
const Settings = lazy(() => import("@/components/Settings"));
const SmartMeterStatus = lazy(() => import("@/components/SmartMeterStatus"));
const MeterSetup = lazy(() => import("@/components/MeterSetup"));
const KPLCTokenDashboard = lazy(() => import("@/components/KPLCTokenDashboard"));
const NotificationCenter = lazy(() => import("@/components/NotificationCenter"));
const MobileDashboard = lazy(() => import("@/components/MobileDashboard"));
const AccountProfile = lazy(() => import("@/components/AccountProfile").then(m => ({ default: m.AccountProfile })));

// Loading component for tab content
const TabLoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="w-8 h-8 bg-aurora-gradient rounded-full flex items-center justify-center animate-pulse">
          <div className="h-4 w-4 bg-white rounded-sm"></div>
        </div>
        <div className="absolute inset-0 w-8 h-8 border-2 border-aurora-green/30 border-t-aurora-green rounded-full animate-spin"></div>
      </div>
      <p className="text-aurora-green-light mt-4">Loading...</p>
    </div>
  </div>
);

// Cache for loaded components to prevent re-mounting
const componentCache = new Map();

type TabConfig = Record<string, { label: string; component: React.LazyExoticComponent<React.ComponentType<any>> | (() => React.ReactElement); visible: boolean }>;


const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadedTabs, setLoadedTabs] = useState(new Set(["dashboard"])); // Pre-load dashboard
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const { user, signOut } = useAuth();
  const { provider, providerConfig, isLoading: providerLoading } = useEnergyProvider();
  const { meterNumber, status: meterStatus } = useMeter();

  // Memoize tab configuration to prevent re-renders and make it reactive to provider changes
  const tabConfig: TabConfig = useMemo(() => {
    // Use safe provider value to avoid initialization issues
    const safeProvider = provider || 'KPLC';
    
    const config = {
      dashboard: { 
        label: isMobile ? "Home" : "Dashboard", 
        component: isMobile ? MobileDashboard : 
                 (safeProvider === 'Solar' || safeProvider === 'SunCulture' || safeProvider === 'M-KOPA Solar' 
                   ? SolarRealTimeDashboard 
                   : EnergyDashboard),
        visible: true
      },
      notifications: { 
        label: isMobile ? "Alerts" : "Notifications", 
        component: NotificationCenter,
        visible: true
      },
      aiAnalysis: {
        label: isMobile ? "AI" : "AI Analysis",
        component: lazy(() => import("@/components/DeepDiveAnalysis").then(m => ({ default: m.DeepDiveAnalysis }))),
        visible: true
      },
      calculator: { 
        label: isMobile ? (safeProvider === 'Solar' || safeProvider === 'SunCulture' || safeProvider === 'M-KOPA Solar' ? "Info" : "Calc") : 
               (safeProvider === 'Solar' || safeProvider === 'SunCulture' || safeProvider === 'M-KOPA Solar' ? "Informatics" : "Calculator"), 
        component: BillCalculator,
        visible: true
      },
      meter: { 
        label: isMobile 
          ? (providerConfig?.terminology?.device === 'inverter' ? "Inverter" : "Meter")
          : (providerConfig?.terminology?.setup || "Meter Setup"), 
        component: MeterSetup,
        visible: true
      },

      settings: { 
        label: "Settings", 
        component: Settings,
        visible: true
      },
      account: {
        label: isMobile ? "Profile" : "My Account",
        component: AccountProfile,
        visible: true
      }
    };

    // Add Pay as You Go tab for solar providers
    // if (safeProvider === 'Solar' || safeProvider === 'SunCulture' || safeProvider === 'M-KOPA Solar') {
    //   config.paygo = {
    //     label: "Pay as You Go",
    //     component: PayAsYouGoDashboard,
    //     visible: true
    //   };
    // }

    // Add tokens/credits tab based on provider capabilities
    // if (providerConfig?.settings?.supportsTokens || providerConfig?.settings?.supportsPayAsYouGo) {
    //   // Don't show tokens tab for solar providers since we have Pay as You Go tab
    //   if (!(safeProvider === 'Solar' || safeProvider === 'SunCulture' || safeProvider === 'M-KOPA Solar')) {
    //     config.tokens = {
    //       label: isMobile
    //         ? (providerConfig?.terminology?.credits === 'credits' ? "Credits" : "Tokens")
    //         : (providerConfig?.terminology?.dashboard || "Tokens"),
    //       component: KPLCTokenDashboard,
    //       visible: true
    //     };
    //   }
    // }

    return config;
  }, [isMobile, provider, providerConfig]);

  // Listen for provider changes and clear cache
  useEffect(() => {
    const handleProviderChange = () => {
      componentCache.clear();
      // Force re-render of current tab
      setLoadedTabs(prev => new Set([...prev]));
    };

    window.addEventListener('energyProviderChanged', handleProviderChange);
    
    return () => {
      window.removeEventListener('energyProviderChanged', handleProviderChange);
    };
  }, []);

  // Optimized tab change handler with preloading
  const handleTabChange = useCallback((value: string) => {
    try {
      setActiveTab(value);
      
      // Mark tab as loaded when accessed
      setLoadedTabs(prev => new Set([...prev, value]));
      
      // Preload adjacent tabs for better UX
      const visibleTabs = Object.entries(tabConfig).filter(([_, config]) => config.visible);
      const tabKeys = visibleTabs.map(([key]) => key);
      const currentIndex = tabKeys.indexOf(value);
      const nextTab = tabKeys[currentIndex + 1];
      const prevTab = tabKeys[currentIndex - 1];
      
      setTimeout(() => {
        if (nextTab) setLoadedTabs(prev => new Set([...prev, nextTab]));
        if (prevTab) setLoadedTabs(prev => new Set([...prev, prevTab]));
      }, 100);
      
    } catch (error) {
      console.error('Error changing tab:', error);
      setActiveTab("dashboard");
    }
  }, [tabConfig]);

  // Memoize navigation handler for MobileDashboard
  const handleNavigate = useCallback((tab: string) => {
    handleTabChange(tab);
  }, [handleTabChange]);

  // Memoize meter navigation handler
  const handleNavigateToMeter = useCallback(() => {
    handleTabChange("meter");
  }, [handleTabChange]);

  // Render tab content with caching
  const renderTabContent = useCallback((tabKey: string) => {
    if (!loadedTabs.has(tabKey)) {
      return <TabLoadingSpinner />;
    }

    // Use cache to prevent re-mounting, but include provider and meter number in cache key
    const cacheKey = `${tabKey}-${isMobile}-${provider || 'KPLC'}-${meterNumber || 'no-meter'}`;
    if (componentCache.has(cacheKey)) {
      return componentCache.get(cacheKey);
    }

    let content;
    const config = tabConfig[tabKey];

    if (!config || !config.visible) {
      // Handle case where tab is not available
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">This feature is not available for your energy provider.</p>
          </div>
        </div>
      );
    }

    switch (tabKey) {
      case 'dashboard':
        content = isMobile ? (
          <MobileDashboard onNavigate={handleNavigate} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="lg:col-span-3">
              {(provider || 'KPLC') === 'Solar' || (provider || 'KPLC') === 'SunCulture' || (provider || 'KPLC') === 'M-KOPA Solar' ? (
                <SolarRealTimeDashboard />
              ) : (
                <EnergyDashboard />
              )}
            </div>
            <div className="lg:col-span-1">
              <SmartMeterStatus onNavigateToMeter={handleNavigateToMeter} />
            </div>
          </div>
        );
        break;
      case 'insights':
        content = <EnergyInsights onNavigateToMeter={handleNavigateToMeter} />;
        break;
      case 'meter':
        content = <MeterSetup />;
        break;
      case 'tokens':
        content = <KPLCTokenDashboard energyProvider={(provider || 'KPLC') as any} />;
        break;
      case 'paygo':
        content = <PayAsYouGoDashboard energyProvider={provider || 'KPLC'} />;
        break;
      default:
        const Component = config.component;
        content = <Component />;
    }

    // Cache the content
    componentCache.set(cacheKey, content);
    return content;
  }, [loadedTabs, tabConfig, isMobile, handleNavigate, handleNavigateToMeter, provider]);

  // Clear cache when mobile state, provider, or meter changes
  useEffect(() => {
    componentCache.clear();
  }, [isMobile, provider, meterNumber]);

  // Preload critical tabs on mount
  useEffect(() => {
    const criticalTabs = ['dashboard', 'notifications'];
    if (tabConfig.tokens?.visible) {
      criticalTabs.push('tokens');
    }
    if (tabConfig.paygo?.visible) {
      criticalTabs.push('paygo');
    }
    setTimeout(() => {
      setLoadedTabs(prev => new Set([...prev, ...criticalTabs]));
    }, 500);
  }, [tabConfig.tokens?.visible, tabConfig.paygo?.visible]);

  // Listen for global navigation events
  useEffect(() => {
    const handleNavigateToMeter = () => {
      handleTabChange("meter");
    };

    const handleNavigateToTab = (event: CustomEvent) => {
      const tab = event.detail;
      if (tab) {
        handleTabChange(tab);
      }
    };

    window.addEventListener('navigate-to-meter', handleNavigateToMeter);
    window.addEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-meter', handleNavigateToMeter);
      window.removeEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    };
  }, [handleTabChange]);

  // Get visible tabs for rendering
  const visibleTabs = Object.entries(tabConfig).filter(([_, config]) => config.visible);
  const visibleTabKeys = visibleTabs.map(([key]) => key);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Glassmorphism Header */}
      <header className="glass-header mb-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 glass-card border-none bg-gradient-to-br from-aurora-green to-blue-500/50">
              <div className="bg-white/20 backdrop-blur-md w-8 h-8 rounded-lg flex items-center justify-center">
                 <div className="bg-white w-3 h-3 rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                AURORA <span className="text-transparent bg-clip-text bg-gradient-to-r from-aurora-green-light to-blue-400">ENERGY</span>
              </h1>
              <p className="text-[10px] md:text-xs font-medium text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <span className="inline-block w-2 h-2 bg-aurora-green rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                SYSTEM: {meterStatus === 'connected' ? 'OPTIMIZED' : 'CHECKING...'} • {provider || 'KPLC'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleTabChange('account')} 
              className={`glass-button text-xs md:text-sm px-4 py-2 ${
                activeTab === 'account' ? 'bg-white/20 border-white/30' : ''
              }`}
            >
              <User className="h-4 w-4" />
              <span className="ml-2">{user?.user_metadata?.full_name?.split(' ')[0] || 'ACCOUNT'}</span>
            </button>
            <button 
              onClick={() => signOut()} 
              className="glass-button bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs md:text-sm px-4 py-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{isMobile ? '' : 'EXIT'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 md:px-4 flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList 
              className="inline-flex w-auto bg-transparent border-none gap-2 p-0 h-auto"
            >
              {visibleTabs.filter(([key]) => key !== 'account').slice(0, isMobile ? 5 : 8).map(([key, config]) => (
                <TabsTrigger 
                  key={key}
                  value={key} 
                  className="glass-button text-xs md:text-sm h-11 px-6 md:px-8 data-[state=active]:bg-white/10 data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
                >
                  {config.label}
                  {key === 'notifications' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg border border-white/20">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Mobile bottom navigation for hidden tabs */}
          {isMobile && visibleTabKeys.length > 5 && (
            <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 px-4 py-6 z-50">
              <div className="grid grid-cols-4 gap-3">
                {visibleTabs.slice(5, 9).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`text-[10px] font-bold uppercase p-3 glass-button ${
                      activeTab === key
                        ? "bg-white/20 border-white/30"
                        : "bg-white/5"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render tab contents with Suspense for lazy loading */}
          {visibleTabKeys.map((tabKey) => (
            <TabsContent
              key={tabKey}
              value={tabKey}
              className={`${isMobile ? "pb-32" : "pb-12"} animate-fade-in`}
            >
              <Suspense fallback={<TabLoadingSpinner />}>
                <div className="glass-card p-4 md:p-6 min-h-[500px]">
                  {renderTabContent(tabKey)}
                </div>
              </Suspense>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Floating Chatbot Widget - always accessible across all tabs */}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
    </div>
  );
};

export default Index;