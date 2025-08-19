import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, User, Send, Calculator, Settings, TrendingUp, Zap, MessageCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface EnergyAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

// Mock energy data for demonstration (completely isolated from auth)
const MOCK_ENERGY_DATA = {
  daily_total: 12.5,
  daily_cost: 312.50,
  current_usage: 2.3,
  efficiency_score: 87,
  weekly_average: 11.2,
  monthly_total: 345.6,
  peak_usage_time: '18:00',
  cost_trend: 'stable' as const
};

const ChatInterface = () => {
  const isMobile = useIsMobile();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Jambo! I'm Aurora, your smart energy assistant for Kenya. I can help you understand your electricity usage, save on bills, and navigate Kenya Power services. What would you like to know?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [alerts, setAlerts] = useState<EnergyAlert[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // COMPLETELY ISOLATED - NO AUTH DEPENDENCIES AT ALL
  // Using mock data instead of real energy data

  // Generate AI alerts based on mock energy data
  const generateAlerts = useCallback(() => {
    const newAlerts: EnergyAlert[] = [];
    const energyData = MOCK_ENERGY_DATA;

    // High usage alert
    if (energyData.daily_total > 15) {
      newAlerts.push({
        id: 'high-usage',
        type: 'warning',
        title: 'High Energy Usage Detected',
        message: `Your daily usage of ${energyData.daily_total.toFixed(2)} kWh is above average. Consider energy-saving measures to reduce costs.`,
        timestamp: new Date()
      });
    }

    // Low efficiency alert
    if (energyData.efficiency_score < 76) {
      newAlerts.push({
        id: 'low-efficiency',
        type: 'warning',
        title: 'Energy Efficiency Alert',
        message: `Your efficiency score is ${energyData.efficiency_score}%. Switch to LED bulbs and unplug unused devices to improve efficiency.`,
        timestamp: new Date()
      });
    }

    // Cost optimization alert
    if (energyData.daily_cost > 500) {
      newAlerts.push({
        id: 'high-cost',
        type: 'warning',
        title: 'High Daily Cost Alert',
        message: `Today's cost of KSh ${energyData.daily_cost.toFixed(2)} is high. Consider using appliances during off-peak hours (10 PM - 6 AM).`,
        timestamp: new Date()
      });
    }

    // Positive efficiency alert
    if (energyData.efficiency_score >= 90) {
      newAlerts.push({
        id: 'excellent-efficiency',
        type: 'success',
        title: 'Excellent Energy Efficiency!',
        message: `Your efficiency score of ${energyData.efficiency_score}% is outstanding. Keep up the great energy-saving habits!`,
        timestamp: new Date()
      });
    }

    // Peak usage time alert
    const currentHour = new Date().getHours();
    if (currentHour >= 18 && currentHour <= 22 && energyData.current_usage > 3) {
      newAlerts.push({
        id: 'peak-time',
        type: 'info',
        title: 'Peak Hours Usage',
        message: 'You\'re using energy during peak hours (6-10 PM). Consider shifting some activities to off-peak hours to save on costs.',
        timestamp: new Date()
      });
    }

    setAlerts(newAlerts);
  }, []);

  useEffect(() => {
    // Generate alerts on component mount
    generateAlerts();
  }, [generateAlerts]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const quickActions = [
    { text: "How can I reduce my electricity bill?", icon: Calculator },
    { text: "Explain my current energy usage", icon: TrendingUp },
    { text: "Set up smart meter alerts", icon: Settings },
    { text: "Kenya Power tariff rates", icon: Zap },
    { text: "Energy saving tips for Kenyan homes", icon: User },
    { text: "Contact Kenya Power customer service", icon: MessageCircle }
  ];

  const getBotResponse = useCallback((userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Use generic user name since we don't have auth
    const userName = 'rafiki';
    
    // Use mock energy data
    const safeEnergyData = MOCK_ENERGY_DATA;
    
    if (message.includes('reduce') || message.includes('save') || message.includes('lower') || message.includes('bill')) {
      return `Here are proven ways to reduce your electricity bill in Kenya:\n\n💡 Immediate Actions:\n• Switch to LED bulbs (save up to 80% on lighting)\n• Unplug devices when not in use\n• Use natural light during the day\n• Set water heater to 60°C maximum\n\n🏠 Home Efficiency:\n• Use fans instead of AC when possible\n• Iron clothes in batches\n• Use pressure cookers for faster cooking\n• Maintain your fridge at 4°C\n\n📊 Your Current Usage: ${safeEnergyData.daily_total.toFixed(2)} kWh today (KSh ${safeEnergyData.daily_cost.toFixed(2)})\nWith these tips, you could save 20-30% monthly!`;
    }
    
    if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
      return `📈 Your Energy Usage Summary:\n\n🔋 Today's Consumption: ${safeEnergyData.daily_total.toFixed(2)} kWh\n💰 Today's Cost: KSh ${safeEnergyData.daily_cost.toFixed(2)}\n⚡ Current Usage: ${safeEnergyData.current_usage.toFixed(2)} kWh\n🎯 Efficiency Score: ${safeEnergyData.efficiency_score}%\n\nAnalysis:\n${safeEnergyData.efficiency_score >= 90 ? '✅ Excellent! You\'re using energy very efficiently.' : safeEnergyData.efficiency_score >= 80 ? '👍 Good usage patterns. Small improvements possible.' : '⚠️ High usage detected. Consider energy-saving measures.'}\n\nKenya Power Average: 150-300 kWh/month for typical households`;
    }
    
    if (message.includes('alert') || message.includes('notification') || message.includes('setup')) {
      return `🔔 Smart Meter Alerts Available:\n\n📱 High Usage Alerts:\n• Daily usage above 15 kWh\n• Unusual consumption patterns\n• Peak hour usage warnings\n\n💸 Bill Notifications:\n• Monthly bill estimates\n• Payment due reminders\n• Balance low warnings\n\n⚡ System Alerts:\n• Power outage notifications\n• Meter maintenance updates\n• Tariff rate changes\n\nSetup: Go to Settings → Notifications to customize your alerts. You can receive them via SMS, email, or push notifications.`;
    }
    
    if (message.includes('tariff') || message.includes('rate') || message.includes('cost') || message.includes('price')) {
      const currentRate = safeEnergyData.daily_total > 0 ? (safeEnergyData.daily_cost / safeEnergyData.daily_total) : 25;
      return `💰 Kenya Power Tariff Rates (2024):\n\n🏠 Domestic Tariff (D1):\n• 0-50 kWh: KSh 12.00/kWh\n• 51-1500 kWh: KSh 25.00/kWh\n• Above 1500 kWh: KSh 30.00/kWh\n\n📋 Additional Charges:\n• Fixed Charge: KSh 300/month\n• Fuel Cost Charge: Variable\n• VAT: 16% on total bill\n• Electricity Levy: KSh 5.08/kWh\n\n⏰ Time of Use (Optional):\n• Peak (6-10 PM): Higher rates\n• Off-peak (10 PM-6 AM): Lower rates\n\nYour Rate: Currently paying ~KSh ${currentRate.toFixed(2)}/kWh`;
    }
    
    if (message.includes('tips') || message.includes('advice') || message.includes('kenya')) {
      return `🇰🇪 Energy Saving Tips for Kenyan Homes:\n\n☀️ Solar Solutions:\n• Solar water heaters (save 40% on bills)\n• Solar lighting for outdoor areas\n• Small solar panels for phone charging\n\n🏠 Appliance Tips:\n• Use charcoal jiko for long cooking\n• Buy energy-efficient appliances (look for Energy Star)\n• Use timer switches for water heaters\n\n🌡️ Climate Considerations:\n• Open windows for natural cooling\n• Use ceiling fans instead of AC\n• Plant trees around your home for shade\n\n💡 Local Hacks:\n• Cook with retained heat (turn off early)\n• Use microwaves for reheating\n• Batch your laundry and ironing`;
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support') || message.includes('help')) {
      return `📞 Kenya Power Customer Support:\n\n🆘 Emergency & Outages:\n• Toll-Free: 95551\n• Mobile: 0711 070 000\n• WhatsApp: 0711 070 000\n\n💬 Customer Service:\n• Email: info@kplc.co.ke\n• Website: www.kplc.co.ke\n• MyPower App (bill payments)\n\n🏢 Regional Offices:\n• Nairobi: Stima Plaza, Kolobot Road\n• Mombasa: Elektra House, Haile Selassie Road\n• Kisumu: KPLC Building, Oginga Odinga Road\n\n⏰ Hours: Monday-Friday 8AM-5PM\nLanguages: English, Kiswahili\n\n🔧 For Aurora Energy Platform:\nUse the Settings → Help section`;
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('jambo') || message.includes('habari')) {
      return `Jambo ${userName}! 🇰🇪\n\nI'm Aurora, your personal energy assistant. I can help you with:\n\n⚡ Energy Management:\n• Understanding your electricity usage\n• Bill calculation and estimation\n• Energy-saving strategies\n\n📊 Smart Features:\n• Real-time usage monitoring\n• Custom alerts and notifications\n• Efficiency recommendations\n\n🏠 Kenya-Specific Help:\n• Kenya Power services and contacts\n• Local energy-saving tips\n• Tariff information and updates\n\nWhat would you like to explore today?`;
    }
    
    return `I'm here to help you manage your energy consumption and save money on electricity bills! 🇰🇪\n\nI can assist with:\n• 📊 Energy usage analysis\n• 💰 Bill reduction strategies\n• ⚙️ Smart meter setup\n• 📞 Kenya Power information\n• 🏠 Home efficiency tips\n\nPopular Questions:\n• "How can I reduce my electricity bill?"\n• "Explain my current energy usage"\n• "What are Kenya Power tariff rates?"\n• "Energy saving tips for Kenyan homes"\n\nWhat specific topic would you like to discuss?`;
  }, []);

  // IMPROVED SEND MESSAGE WITH PROPER TIMING
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    
    // Clear any existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Start typing indicator
    setIsTyping(true);

    // Generate bot response with proper delay
    typingTimeoutRef.current = setTimeout(() => {
      try {
        const botResponseText = getBotResponse(currentInput);
        
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: botResponseText,
          isBot: true,
          timestamp: new Date()
        };

        // Add bot message and stop typing
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      } catch (error) {
        console.error('Chat error:', error);
        
        // Fallback response
        const fallbackMessage: Message = {
          id: `bot-fallback-${Date.now()}`,
          text: "I'm here to help with your energy questions! Please try asking again.",
          isBot: true,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, fallbackMessage]);
        setIsTyping(false);
      }
    }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds delay
  }, [inputValue, isTyping, getBotResponse]);

  const handleQuickAction = useCallback((action: string) => {
    if (!isTyping) {
      setInputValue(action);
    }
  }, [isTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: string) => {
    return type === 'warning' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-4">
      {/* AI Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base md:text-lg font-semibold text-aurora-green-light flex items-center gap-2">
            <Bot className="h-4 w-4 md:h-5 md:w-5" />
            AI Energy Alerts
          </h3>
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={getAlertVariant(alert.type)} className="bg-aurora-card border-aurora-green/20">
              {getAlertIcon(alert.type)}
              <AlertTitle className="text-aurora-green-light text-sm md:text-base">{alert.title}</AlertTitle>
              <AlertDescription className="text-gray-300 text-xs md:text-sm">
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Chat Interface */}
      <Card className={`${isMobile ? 'h-[70vh]' : 'h-[600px]'} flex flex-col bg-aurora-card border-aurora-green/20`}>
        <CardHeader className="bg-aurora-gradient p-3 md:p-6">
          <CardTitle className="text-white font-medium flex items-center gap-2 text-sm md:text-base">
            <Bot className="h-4 w-4 md:h-5 md:w-5" />
            Aurora Assistant 🇰🇪
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
              Demo Mode
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                {message.isBot && (
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[80%] p-2 md:p-3 rounded-lg text-xs md:text-sm whitespace-pre-line break-words ${
                    message.isBot
                      ? 'bg-slate-800 text-gray-200 rounded-tl-none'
                      : 'bg-aurora-green text-white rounded-tr-none'
                  }`}
                  style={{ 
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  {message.text}
                </div>
                {!message.isBot && (
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-aurora-blue-light flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2 justify-start animate-fade-in">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                <div className="bg-slate-800 text-gray-200 p-2 md:p-3 rounded-lg rounded-tl-none text-xs md:text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && !isTyping && (
            <div className="p-2 md:p-4 border-t border-slate-700">
              <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-3">Quick actions:</p>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1'} gap-2`}>
                {quickActions.slice(0, isMobile ? 3 : 4).map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.text)}
                    className="text-xs justify-start h-8 border-slate-600 hover:bg-slate-800 gap-2"
                    disabled={isTyping}
                  >
                    <action.icon className="h-3 w-3" />
                    <span className={isMobile ? "truncate" : ""}>{action.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="p-2 md:p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isMobile ? "Ask about energy..." : "Ask about energy saving, bills, Kenya Power..."}
                className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 text-sm"
                disabled={isTyping}
              />
              <Button
                onClick={sendMessage}
                size="icon"
                className="bg-aurora-green hover:bg-aurora-green-light h-9 w-9 md:h-10 md:w-10"
                disabled={!inputValue.trim() || isTyping}
              >
                <Send className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
            <p className="text-xs text-blue-400 mt-2 text-center">
              Chat assistant running in demo mode - completely isolated from authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;