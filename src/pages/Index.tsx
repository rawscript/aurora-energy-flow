import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnergyDashboard from "@/components/EnergyDashboard";
import EnergyInsights from "@/components/EnergyInsights";
import BillCalculator from "@/components/BillCalculator";
import ChatInterface from "@/components/ChatInterface";
import Chatbot from "@/components/Chatbot";
import Settings from "@/components/Settings";
import SmartMeterStatus from "@/components/SmartMeterStatus";
import MeterSetup from "@/components/MeterSetup";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const isMobile = useIsMobile();

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-6'} bg-aurora-card border border-aurora-green/20`}>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs md:text-sm">
              {isMobile ? "Home" : "Dashboard"}
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
                <TabsTrigger value="meter" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs p-2">
                  Meter
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs p-2">
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs p-2">
                  Settings
                </TabsTrigger>
              </div>
            </div>
          )}

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-3">
                <EnergyDashboard />
              </div>
              <div className="lg:col-span-1">
                <SmartMeterStatus />
              </div>
            </div>
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
