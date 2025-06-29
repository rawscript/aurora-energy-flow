import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import EnergyDashboard from "@/components/EnergyDashboard";
import EnergyInsights from "@/components/EnergyInsights";
import BillCalculator from "@/components/BillCalculator";
import Chatbot from "@/components/Chatbot";
import Settings from "@/components/Settings";
import SmartMeterStatus from "@/components/SmartMeterStatus";
import MeterSetup from "@/components/MeterSetup";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-aurora-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-aurora-green-light mb-2">
            Aurora Energy Monitor
          </h1>
          <p className="text-gray-400">
            Real-time energy monitoring powered by Kenya Power smart meters
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-aurora-card border border-aurora-green/20">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              Insights
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              Calculator
            </TabsTrigger>
            <TabsTrigger value="meter" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              Meter Setup
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <EnergyDashboard />
              </div>
              <div className="lg:col-span-1">
                <SmartMeterStatus />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <EnergyInsights />
          </TabsContent>

          <TabsContent value="calculator">
            <BillCalculator />
          </TabsContent>

          <TabsContent value="meter">
            <MeterSetup />
          </TabsContent>

          <TabsContent value="chat">
            <Chatbot />
          </TabsContent>

          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
