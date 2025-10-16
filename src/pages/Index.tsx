import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useEnergyProvider } from "@/contexts/EnergyProviderContext";
import { useMeter } from "@/contexts/MeterContext";
import { Info } from "lucide-react";

// Lazy load components for better performance
const EnergyDashboard = lazy(() => import("@/components/EnergyDashboard"));
const EnergyInsightsDashboard = lazy(() => import("@/components/EnergyInsightsDashboard"));
const DemandDrivenEnergyData = lazy(() => import("@/components/DemandDrivenEnergyData"));
const SolarRealTimeDashboard = lazy(() => import("@/components/SolarRealTimeDashboard"));
const PayAsYouGoDashboard = lazy(() => import("@/components/PayAsYouGoDashboard"));
const EnergyInsights = lazy(() => import("@/components/EnergyInsights"));
const BillCalculator = lazy(() => import("@/components/BillCalculator"));
const ChatInterface = lazy(() => import("@/components/ChatInterface"));
const Chatbot = lazy(() => import("@/components/Chatbot"));
const Settings = lazy(() => import("@/components/Settings"));
const SmartMeterStatus = lazy(() => import("@/components/SmartMeterStatus"));
const MeterSetup = lazy(() => import("@/components/MeterSetup"));
const KPLCTokenDashboard = lazy(() => import("@/components/KPLCTokenDashboard"));
const NotificationCenter = lazy(() => import("@/components/NotificationCenter"));
const MobileDashboard = lazy(() => import("@/components/MobileDashboard"));

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

interface TabConfig {
  dashboard: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>> | (() => React.ReactElement); visible: boolean };
  paygo?: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  notifications: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  insights: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  calculator: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  meter: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>> | (() => React.ReactElement); visible: boolean };
  chat: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  settings: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
  tokens?: { label: string; component: React.LazyExoticComponent<React.ComponentType<any>>; visible: boolean };
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadedTabs, setLoadedTabs] = useState(new Set(["dashboard"])); // Pre-load dashboard
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { provider, providerConfig, isLoading: providerLoading } = useEnergyProvider();
  const { meterNumber, status: meterStatus } = useMeter();

  // Memoize tab configuration to prevent re-renders and make it reactive to provider changes
  const tabConfig: TabConfig = useMemo(() => {
    const config: TabConfig = {
      dashboard: { 
        label: isMobile ? "Home" : "Dashboard", 
        component: isMobile ? MobileDashboard : 
                 (provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' 
                   ? SolarRealTimeDashboard 
                   : EnergyDashboard),
        visible: true
      },
      notifications: { 
        label: isMobile ? "Alerts" : "Notifications", 
        component: NotificationCenter,
        visible: true
      },
      insights: { 
        label: "Insights", 
        component: EnergyInsights,
        visible: true
      },
      calculator: { 
        label: isMobile ? (provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? "Info" : "Calc") : 
               (provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? "Informatics" : "Calculator"), 
        component: BillCalculator,
        visible: true
      },
      meter: { 
        label: isMobile 
          ? (providerConfig.terminology.device === 'inverter' ? "Inverter" : "Meter")
          : providerConfig.terminology.setup, 
        component: MeterSetup,
        visible: true
      },
      chat: { 
        label: isMobile ? "AI Chat" : "AI Assistant", 
        component: ChatInterface,
        visible: !isMobile
      },
      settings: { 
        label: "Settings", 
        component: Settings,
        visible: true
      }
    };

    // Add Pay as You Go tab for solar providers
    if (provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar') {
      config.paygo = {
        label: "Pay as You Go",
        component: PayAsYouGoDashboard,
        visible: true
      };
    }

    // Add tokens/credits tab based on provider capabilities
    if (providerConfig.settings.supportsTokens || providerConfig.settings.supportsPayAsYouGo) {
      // Don't show tokens tab for solar providers since we have Pay as You Go tab
      if (!(provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar')) {
        config.tokens = {
          label: isMobile
            ? (providerConfig.terminology.credits === 'credits' ? "Credits" : "Tokens")
            : providerConfig.terminology.dashboard,
          component: KPLCTokenDashboard,
          visible: true
        };
      }
    }

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
    const cacheKey = `${tabKey}-${isMobile}-${provider}-${meterNumber || 'no-meter'}`;
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
              {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
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
        content = <KPLCTokenDashboard energyProvider={provider as any} />;
        break;
      case 'paygo':
        content = <PayAsYouGoDashboard energyProvider={provider} />;
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
    <div className="min-h-screen bg-aurora-dark">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-aurora-green-light mb-2">
            Aurora Energy Monitor
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            {provider ? `Real-time energy monitoring powered by ${providerConfig.name}` : 'Real-time energy monitoring'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList 
            className={`grid w-full bg-aurora-card border border-aurora-green/20`}
            style={{ gridTemplateColumns: `repeat(${Math.min(visibleTabKeys.length, isMobile ? 5 : 8)}, minmax(0, 1fr))` }}
          >
            {visibleTabs.slice(0, isMobile ? 5 : 8).map(([key, config]) => (
              <TabsTrigger 
                key={key}
                value={key} 
                className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm relative"
                style={{
                  backgroundColor: activeTab === key && provider ? providerConfig.colors.primary : undefined
                }}
              >
                {config.label}
                {key === 'notifications' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mobile bottom navigation for hidden tabs */}
          {isMobile && visibleTabKeys.length > 5 && (
            <div className="fixed bottom-0 left-0 right-0 bg-aurora-card border-t border-aurora-green/20 px-2 py-2 z-50">
              <div className="grid grid-cols-4 gap-1">
                {visibleTabs.slice(5, 9).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`text-xs p-2 rounded transition-colors ${
                      activeTab === key
                        ? "bg-aurora-green text-black"
                        : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                    style={{
                      backgroundColor: activeTab === key && provider ? providerConfig.colors.primary : undefined
                    }}
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
              className={isMobile ? "pb-20" : ""}
            >
              <Suspense fallback={<TabLoadingSpinner />}>
                {renderTabContent(tabKey)}
              </Suspense>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* Keep the floating chatbot for use outside the chat tab, but hide on mobile when chat tab is active */}
      {(activeTab !== "chat" || !isMobile) && !isMobile && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}
    </div>
  );
};

export default Index;