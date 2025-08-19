import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnergyDashboard from "@/components/EnergyDashboard";
import EnergyInsights from "@/components/EnergyInsights";
import BillCalculator from "@/components/BillCalculator";
import ChatInterface from "@/components/ChatInterface";
import Chatbot from "@/components/Chatbot";
import Settings from "@/components/Settings";
import SmartMeterStatus from "@/components/SmartMeterStatus";
import MeterSetup from "@/components/MeterSetup";
import KPLCTokenDashboard from "@/components/KPLCTokenDashboard";
import NotificationCenter from "@/components/NotificationCenter";
import MobileDashboard from "@/components/MobileDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();

  // Handle mobile tab navigation safely
  const handleTabChange = (value: string) => {
    try {
      setActiveTab(value);
    } catch (error) {
      console.error('Error changing tab:', error);
      // Fallback to dashboard if there's an error
      setActiveTab("dashboard");
    }
  };

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
              {isMobile ? "Home" : "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {isMobile ? "Tokens" : "KPLC Tokens"}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm relative">
              {isMobile ? "Alerts" : "Notifications"}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              Insights
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {isMobile ? "Calc" : "Calculator"}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="meter" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  Meter Setup
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  AI Assistant
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
                  Settings
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Mobile bottom navigation for hidden tabs */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-aurora-card border-t border-aurora-green/20 px-2 py-2 z-50">
              <div className="grid grid-cols-3 gap-2">
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

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            {isMobile ? (
              <MobileDashboard onNavigate={setActiveTab} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="lg:col-span-3">
                  <EnergyDashboard />
                </div>
                <div className="lg:col-span-1">
                  <SmartMeterStatus onNavigateToMeter={() => setActiveTab("meter")} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tokens" className={isMobile ? "pb-20" : ""}>
            <KPLCTokenDashboard />
          </TabsContent>

          <TabsContent value="notifications" className={isMobile ? "pb-20" : ""}>
            <NotificationCenter />
          </TabsContent>

          <TabsContent value="insights" className={isMobile ? "pb-20" : ""}>
            <EnergyInsights />
          </TabsContent>

          <TabsContent value="calculator" className={isMobile ? "pb-20" : ""}>
            <BillCalculator />
          </TabsContent>

          <TabsContent value="meter" className={isMobile ? "pb-20" : ""}>
            <MeterSetup />
          </TabsContent>

          <TabsContent value="chat" className={isMobile ? "pb-20" : ""}>
            <ChatInterface />
          </TabsContent>

          <TabsContent value="settings" className={isMobile ? "pb-20" : ""}>
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Keep the floating chatbot for use outside the chat tab, but hide on mobile when chat tab is active */}
      {(activeTab !== "chat" || !isMobile) && !isMobile && <Chatbot />}
    </div>
  );
};

export default Index;
