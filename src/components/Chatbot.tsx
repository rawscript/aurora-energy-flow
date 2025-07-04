
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User, Zap, Calculator, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';


const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;


interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { energyData } = useRealTimeEnergy();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { text: "How can I reduce my electricity bill?", icon: Calculator },
    { text: "Explain my current energy usage", icon: TrendingUp },
    { text: "Set up smart meter alerts", icon: Settings },
    { text: "Kenya Power tariff rates", icon: Zap },
    { text: "Energy saving tips for Kenyan homes", icon: User },
    { text: "Contact Kenya Power customer service", icon: MessageCircle }
  ];

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('reduce') || message.includes('save') || message.includes('lower') || message.includes('bill')) {
      return `Here are proven ways to reduce your electricity bill in Kenya:\n\n💡 **Immediate Actions:**\n• Switch to LED bulbs (save up to 80% on lighting)\n• Unplug devices when not in use\n• Use natural light during the day\n• Set water heater to 60°C maximum\n\n🏠 **Home Efficiency:**\n• Use fans instead of AC when possible\n• Iron clothes in batches\n• Use pressure cookers for faster cooking\n• Maintain your fridge at 4°C\n\n📊 **Your Current Usage:** ${energyData.daily_total.toFixed(2)} kWh today (KSh ${energyData.daily_cost.toFixed(2)})\nWith these tips, you could save 20-30% monthly!`;
    }
    
    if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
      return `📈 **Your Energy Usage Summary:**\n\n🔋 **Today's Consumption:** ${energyData.daily_total.toFixed(2)} kWh\n💰 **Today's Cost:** KSh ${energyData.daily_cost.toFixed(2)}\n⚡ **Current Usage:** ${energyData.current_usage.toFixed(2)} kWh\n🎯 **Efficiency Score:** ${energyData.efficiency_score}%\n\n**Analysis:**\n${energyData.efficiency_score >= 90 ? '✅ Excellent! You\'re using energy very efficiently.' : energyData.efficiency_score >= 80 ? '👍 Good usage patterns. Small improvements possible.' : '⚠️ High usage detected. Consider energy-saving measures.'}\n\n**Kenya Power Average:** 150-300 kWh/month for typical households`;
    }
    
    if (message.includes('alert') || message.includes('notification') || message.includes('setup')) {
      return `🔔 **Smart Meter Alerts Available:**\n\n📱 **High Usage Alerts:**\n• Daily usage above 15 kWh\n• Unusual consumption patterns\n• Peak hour usage warnings\n\n💸 **Bill Notifications:**\n• Monthly bill estimates\n• Payment due reminders\n• Balance low warnings\n\n⚡ **System Alerts:**\n• Power outage notifications\n• Meter maintenance updates\n• Tariff rate changes\n\n**Setup:** Go to Settings → Notifications to customize your alerts. You can receive them via SMS, email, or push notifications.`;
    }
    
    if (message.includes('tariff') || message.includes('rate') || message.includes('cost') || message.includes('price')) {
      return `💰 **Kenya Power Tariff Rates (2024):**\n\n🏠 **Domestic Tariff (D1):**\n• 0-50 kWh: KSh 12.00/kWh\n• 51-1500 kWh: KSh 25.00/kWh\n• Above 1500 kWh: KSh 30.00/kWh\n\n📋 **Additional Charges:**\n• Fixed Charge: KSh 300/month\n• Fuel Cost Charge: Variable\n• VAT: 16% on total bill\n• Electricity Levy: KSh 5.08/kWh\n\n⏰ **Time of Use (Optional):**\n• Peak (6-10 PM): Higher rates\n• Off-peak (10 PM-6 AM): Lower rates\n\n**Your Rate:** Currently paying ~KSh ${(energyData.daily_cost / energyData.daily_total || 25).toFixed(2)}/kWh`;
    }
    
    if (message.includes('tips') || message.includes('advice') || message.includes('kenya')) {
      return `🇰🇪 **Energy Saving Tips for Kenyan Homes:**\n\n☀️ **Solar Solutions:**\n• Solar water heaters (save 40% on bills)\n• Solar lighting for outdoor areas\n• Small solar panels for phone charging\n\n🏠 **Appliance Tips:**\n• Use charcoal jiko for long cooking\n• Buy energy-efficient appliances (look for Energy Star)\n• Use timer switches for water heaters\n\n🌡️ **Climate Considerations:**\n• Open windows for natural cooling\n• Use ceiling fans instead of AC\n• Plant trees around your home for shade\n\n💡 **Local Hacks:**\n• Cook with retained heat (turn off early)\n• Use microwaves for reheating\n• Batch your laundry and ironing`;
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support') || message.includes('help')) {
      return `📞 **Kenya Power Customer Support:**\n\n🆘 **Emergency & Outages:**\n• Toll-Free: 95551\n• Mobile: 0711 070 000\n• WhatsApp: 0711 070 000\n\n💬 **Customer Service:**\n• Email: info@kplc.co.ke\n• Website: www.kplc.co.ke\n• MyPower App (bill payments)\n\n🏢 **Regional Offices:**\n• Nairobi: Stima Plaza, Kolobot Road\n• Mombasa: Elektra House, Haile Selassie Road\n• Kisumu: KPLC Building, Oginga Odinga Road\n\n⏰ **Hours:** Monday-Friday 8AM-5PM\n**Languages:** English, Kiswahili\n\n🔧 **For Aurora Energy Platform:**\nUse the Settings → Help section`;
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('jambo') || message.includes('habari')) {
      return `Jambo ${user?.user_metadata?.full_name || 'rafiki'}! 🇰🇪\n\nI'm Aurora, your personal energy assistant. I can help you with:\n\n⚡ **Energy Management:**\n• Understanding your electricity usage\n• Bill calculation and estimation\n• Energy-saving strategies\n\n📊 **Smart Features:**\n• Real-time usage monitoring\n• Custom alerts and notifications\n• Efficiency recommendations\n\n🏠 **Kenya-Specific Help:**\n• Kenya Power services and contacts\n• Local energy-saving tips\n• Tariff information and updates\n\nWhat would you like to explore today?`;
    }
    
    return `I'm here to help you manage your energy consumption and save money on electricity bills! 🇰🇪\n\n**I can assist with:**\n• 📊 Energy usage analysis\n• 💰 Bill reduction strategies\n• ⚙️ Smart meter setup\n• 📞 Kenya Power information\n• 🏠 Home efficiency tips\n\n**Popular Questions:**\n• "How can I reduce my electricity bill?"\n• "Explain my current energy usage"\n• "What are Kenya Power tariff rates?"\n• "Energy saving tips for Kenyan homes"\n\nWhat specific topic would you like to discuss?`;
    };

 const sendMessage = async () => {
  if (!inputValue.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    text: inputValue,
    isBot: false,
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInputValue('');
  setIsTyping(true);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are Aurora, a friendly Kenyan energy assistant. Offer accurate and localized advice about electricity usage, Kenya Power services, energy efficiency, and cost-saving tips. Use Swahili slang sparingly to sound local and helpful."
          },
          { role: "user", content: inputValue }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    console.log("OpenAI API Response:", data);

    if (!response.ok || !data.choices?.[0]?.message?.content) {
      throw new Error(data.error?.message || "Failed to get reply from OpenAI");
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: data.choices[0].message.content.trim(),
      isBot: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
  } catch (error) {
    console.error("OpenAI Error:", error);
    setMessages(prev => [
      ...prev,
      {
        id: (Date.now() + 2).toString(),
        text: "⚠️ Aurora had a hiccup. Try again shortly or check your connection.",
        isBot: true,
        timestamp: new Date()
      }
    ]);
  } finally {
    setIsTyping(false);
  }
};



  const handleQuickAction = (action: string) => {
    setInputValue(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-aurora-green hover:bg-aurora-green-light shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-xl z-50 bg-slate-900 border-aurora-green/20">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-aurora-gradient">
        <CardTitle className="text-white font-medium flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Aurora Assistant 🇰🇪
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0  overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              {message.isBot && (
                <div className="w-8 h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-line ${
                  message.isBot
                    ? 'bg-slate-800 text-gray-200'
                    : 'bg-aurora-green text-white'
                }`}
              >
                {message.text}
              </div>
              {!message.isBot && (
                <div className="w-8 h-8 rounded-full bg-aurora-blue-light flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-slate-800 text-gray-200 p-3 rounded-lg text-sm">
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

        {messages.length === 1 && (
          <div className="p-4 border-t border-slate-700">
            <p className="text-sm text-gray-400 mb-3">Quick actions:</p>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.slice(0, 4).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.text)}
                  className="text-xs justify-start h-8 border-slate-600 hover:bg-slate-800 gap-2"
                >
                  <action.icon className="h-3 w-3" />
                  {action.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about energy saving, bills, Kenya Power..."
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-400"
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-aurora-green hover:bg-aurora-green-light"
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chatbot;
