import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Lazy load components for better performance
const EnergyDashboard = lazy(() => import("@/components/EnergyDashboard"));
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
    <div className="relative">
      <div className="w-8 h-8 bg-aurora-gradient rounded-full flex items-center justify-center animate-pulse">
        <div className="h-4 w-4 bg-white rounded-sm"></div>
      </div>
      <div className="absolute inset-0 w-8 h-8 border-2 border-aurora-green/30 border-t-aurora-green rounded-full animate-spin"></div>
    </div>
  </div>
);

// Cache for loaded components to prevent re-mounting
const componentCache = new Map();

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadedTabs, setLoadedTabs] = useState(new Set(["dashboard"])); // Pre-load dashboard
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const [energyProvider, setEnergyProvider] = useState<string>('KPLC');

  // Memoize tab configuration to prevent re-renders
  const tabConfig = useMemo(() => {
    const config = {
      dashboard: { label: isMobile ? "Home" : "Dashboard", component: isMobile ? MobileDashboard : EnergyDashboard },
      notifications: { label: isMobile ? "Alerts" : "Notifications", component: NotificationCenter },
      insights: { label: "Insights", component: EnergyInsights },
      calculator: { label: isMobile ? "Calc" : "Calculator", component: BillCalculator },
      meter: { label: isMobile ? "Meter" : "Meter Setup", component: MeterSetup },
      chat: { label: isMobile ? "AI Chat" : "AI Assistant", component: ChatInterface },
      settings: { label: "Settings", component: Settings }
    };

    // Only hide the tokens tab if the energy provider is Solar and settings are saved
    if (energyProvider !== 'Solar') {
      config.tokens = { label: isMobile ? "Tokens" : "KPLC Tokens", component: KPLCTokenDashboard };
    }

    return config;
  }, [isMobile, energyProvider]);

  // Optimized tab change handler with preloading
  const handleTabChange = useCallback((value: string) => {
    try {
      setActiveTab(value);
      
      // Mark tab as loaded when accessed
      setLoadedTabs(prev => new Set([...prev, value]));
      
      // Preload adjacent tabs for better UX
      const tabKeys = Object.keys(tabConfig);
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

    // Use cache to prevent re-mounting
    const cacheKey = `${tabKey}-${isMobile}`;
    if (componentCache.has(cacheKey)) {
      return componentCache.get(cacheKey);
    }

    let content;
    const config = tabConfig[tabKey];

    if (!config) {
      // Handle case where tab is not available (e.g., tokens tab for non-KPLC users)
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
              <EnergyDashboard />
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
      default:
        const Component = config.component;
        content = <Component />;
    }

    // Cache the content
    componentCache.set(cacheKey, content);
    return content;
  }, [loadedTabs, tabConfig, isMobile, handleNavigate, handleNavigateToMeter]);

  // Clear cache when mobile state changes
  useEffect(() => {
    componentCache.clear();
  }, [isMobile]);

  // Fetch user's energy provider
  useEffect(() => {
    const fetchEnergyProvider = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setEnergyProvider(profile.energy_provider || 'KPLC');
        }
      } catch (error) {
        console.error("Error fetching energy provider:", error);
      }
    };

    fetchEnergyProvider();
  }, [user]);

  // Preload critical tabs on mount
  useEffect(() => {
    const criticalTabs = ['dashboard', 'tokens', 'notifications'];
    setTimeout(() => {
      setLoadedTabs(prev => new Set([...prev, ...criticalTabs]));
    }, 500);
  }, []);

  // Listen for global navigation events (fallback for components without navigation props)
  useEffect(() => {
    const handleNavigateToMeter = () => {
      handleTabChange("meter");
    };

    window.addEventListener('navigate-to-meter', handleNavigateToMeter);
    
    return () => {
      window.removeEventListener('navigate-to-meter', handleNavigateToMeter);
    };
  }, [handleTabChange]);

  return (
    <div className="min-h-screen bg-aurora-dark">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-aurora-green-light mb-2">
            Aurora Energy Monitor
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Real-time energy monitoring powered by Kenya Power smart meters
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-5' : 'grid-cols-8'} bg-aurora-card border border-aurora-green/20`}>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {tabConfig.dashboard.label}
            </TabsTrigger>
            {energyProvider === 'KPLC' && (
              <TabsTrigger value="tokens" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                {tabConfig.tokens?.label}
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm relative">
              {tabConfig.notifications.label}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {tabConfig.insights.label}
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {tabConfig.calculator.label}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="meter" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  {tabConfig.meter.label}
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  {tabConfig.chat.label}
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  {tabConfig.settings.label}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Mobile bottom navigation for hidden tabs */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-aurora-card border-t border-aurora-green/20 px-2 py-2 z-50">
              <div className="grid grid-cols-3 gap-2">
                {energyProvider === 'KPLC' && (
                  <button
                    onClick={() => handleTabChange("tokens")}
                    className={`text-xs p-2 rounded transition-colors ${
                      activeTab === "tokens"
                        ? "bg-aurora-green text-black"
                        : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    Tokens
                  </button>
                )}
                <button
                  onClick={() => handleTabChange("meter")}
                  className={`text-xs p-2 rounded transition-colors ${
                    activeTab === "meter"
                      ? "bg-aurora-green text-black"
                      : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  Meter
                </button>
                <button
                  onClick={() => handleTabChange("chat")}
                  className={`text-xs p-2 rounded transition-colors ${
                    activeTab === "chat"
                      ? "bg-aurora-green text-black"
                      : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  AI Chat
                </button>
                <button
                  onClick={() => handleTabChange("settings")}
                  className={`text-xs p-2 rounded transition-colors ${
                    activeTab === "settings"
                      ? "bg-aurora-green text-black"
                      : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
          )}

          {/* Render tab contents with Suspense for lazy loading */}
          {Object.keys(tabConfig).map((tabKey) => (
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