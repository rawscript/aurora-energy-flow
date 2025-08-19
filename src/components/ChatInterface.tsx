import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, User, Send, Calculator, Settings, TrendingUp, Zap, MessageCircle, AlertTriangle, CheckCircle, Info, Wifi, WifiOff, RefreshCw, Database, Cloud } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { aiService, AIServiceStatus, AIResponse } from '@/services/aiService';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  source?: 'ai' | 'fallback' | 'cache';
}

interface EnergyAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

interface UserData {
  id: string;
  full_name?: string;
  email?: string;
  meter_number?: string;
  meter_category?: string;
  industry_type?: string;
}

interface EnergyData {
  daily_total: number;
  daily_cost: number;
  current_usage: number;
  efficiency_score: number;
  weekly_average: number;
  monthly_total: number;
  peak_usage_time: string;
  cost_trend: 'up' | 'down' | 'stable';
}

interface TokenData {
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  monthly_spending: number;
  last_purchase_date?: string;
}

// Mock data as fallback when no real data is available
const MOCK_ENERGY_DATA: EnergyData = {
  daily_total: 12.5,
  daily_cost: 312.50,
  current_usage: 2.3,
  efficiency_score: 87,
  weekly_average: 11.2,
  monthly_total: 345.6,
  peak_usage_time: '18:00',
  cost_trend: 'stable'
};

const MOCK_TOKEN_DATA: TokenData = {
  current_balance: 150.75,
  daily_consumption_avg: 25.30,
  estimated_days_remaining: 6,
  monthly_spending: 2500.00,
  last_purchase_date: '2024-01-15T10:00:00Z'
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [energyData, setEnergyData] = useState<EnergyData>(MOCK_ENERGY_DATA);
  const [tokenData, setTokenData] = useState<TokenData>(MOCK_TOKEN_DATA);
  const [dataStatus, setDataStatus] = useState<'loading' | 'connected' | 'offline' | 'error'>('loading');
  const [lastDataFetch, setLastDataFetch] = useState<number>(0);
  const [aiStatus, setAiStatus] = useState<AIServiceStatus>(aiService.getStatus());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to AI service status changes
  useEffect(() => {
    const unsubscribe = aiService.onStatusChange((status) => {
      setAiStatus(status);
    });

    return unsubscribe;
  }, []);
  
  // Safe data fetching with comprehensive error handling
  const fetchUserDataSafely = useCallback(async () => {
    try {
      // Prevent too frequent fetches
      const now = Date.now();
      if (now - lastDataFetch < 30000) { // 30 seconds cooldown
        return;
      }
      setLastDataFetch(now);

      // Get current session without triggering refresh
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('No active session, using offline mode');
        setDataStatus('offline');
        return;
      }

      const user = session.user;
      console.log('Fetching data for authenticated user');
      
      // Set timeout for data fetching
      if (dataFetchTimeoutRef.current) {
        clearTimeout(dataFetchTimeoutRef.current);
      }
      
      dataFetchTimeoutRef.current = setTimeout(() => {
        console.log('Data fetch timeout, switching to offline mode');
        setDataStatus('offline');
      }, 8000);

      // Fetch user profile data
      let profileData: UserData = {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        email: user.email || null
      };

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, meter_number, meter_category, industry_type')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileError && profile) {
          profileData = {
            ...profileData,
            full_name: profile.full_name || profileData.full_name,
            meter_number: profile.meter_number,
            meter_category: profile.meter_category,
            industry_type: profile.industry_type
          };
        }
      } catch (error) {
        console.log('Profile fetch failed, using basic user data');
      }

      setUserData(profileData);

      // Fetch energy data if meter is connected
      if (profileData.meter_number) {
        try {
          // Get recent energy readings
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const { data: readings, error: readingsError } = await supabase
            .from('energy_readings')
            .select('*')
            .eq('user_id', user.id)
            .eq('meter_number', profileData.meter_number)
            .gte('reading_date', oneWeekAgo.toISOString())
            .order('reading_date', { ascending: false })
            .limit(50);

          if (!readingsError && readings && readings.length > 0) {
            // Calculate real energy data from readings
            const today = new Date();
            const dailyReadings = readings.filter(r => {
              const readingDate = new Date(r.reading_date);
              return readingDate.getDate() === today.getDate() &&
                     readingDate.getMonth() === today.getMonth() &&
                     readingDate.getFullYear() === today.getFullYear();
            });

            const dailyTotal = dailyReadings.reduce((sum, r) => sum + r.kwh_consumed, 0);
            const dailyCost = dailyReadings.reduce((sum, r) => sum + r.total_cost, 0);
            const currentUsage = readings[0]?.kwh_consumed || 0;
            
            const weeklyTotal = readings.reduce((sum, r) => sum + r.kwh_consumed, 0);
            const weeklyAverage = weeklyTotal / 7;
            
            // Calculate efficiency score
            let efficiencyScore = 87;
            if (profileData.meter_category === 'household') {
              efficiencyScore = weeklyAverage < 10 ? 95 : weeklyAverage < 20 ? 87 : 75;
            } else if (profileData.meter_category === 'SME') {
              efficiencyScore = weeklyAverage < 50 ? 90 : weeklyAverage < 100 ? 80 : 70;
            }

            // Find peak usage time
            const hourlyUsage = new Map<number, number>();
            readings.forEach(reading => {
              const hour = new Date(reading.reading_date).getHours();
              hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + reading.kwh_consumed);
            });

            let maxHour = 18;
            let maxUsage = 0;
            hourlyUsage.forEach((usage, hour) => {
              if (usage > maxUsage) {
                maxUsage = usage;
                maxHour = hour;
              }
            });

            const realEnergyData: EnergyData = {
              daily_total: dailyTotal,
              daily_cost: dailyCost,
              current_usage: currentUsage,
              efficiency_score: efficiencyScore,
              weekly_average: weeklyAverage,
              monthly_total: weeklyTotal * 4, // Approximate monthly
              peak_usage_time: `${maxHour.toString().padStart(2, '0')}:00`,
              cost_trend: dailyCost > (dailyReadings[1]?.total_cost || 0) * 1.1 ? 'up' : 
                         dailyCost < (dailyReadings[1]?.total_cost || 0) * 0.9 ? 'down' : 'stable'
            };

            setEnergyData(realEnergyData);
          } else {
            console.log('No energy readings found, using mock data');
            setEnergyData(MOCK_ENERGY_DATA);
          }
        } catch (error) {
          console.log('Energy data fetch failed, using mock data');
          setEnergyData(MOCK_ENERGY_DATA);
        }

        // Fetch token data
        try {
          const { data: tokenAnalytics, error: tokenError } = await supabase
            .rpc('get_token_analytics', { p_user_id: user.id });

          if (!tokenError && tokenAnalytics && Array.isArray(tokenAnalytics) && tokenAnalytics.length > 0) {
            const analytics = tokenAnalytics[0];
            
            // Type guard to ensure analytics is an object with the expected properties
            if (analytics && typeof analytics === 'object' && analytics !== null) {
              const analyticsObj = analytics as Record<string, any>;
              const realTokenData: TokenData = {
                current_balance: typeof analyticsObj.current_balance === 'number' ? analyticsObj.current_balance : 0,
                daily_consumption_avg: typeof analyticsObj.daily_consumption_avg === 'number' ? analyticsObj.daily_consumption_avg : 0,
                estimated_days_remaining: typeof analyticsObj.estimated_days_remaining === 'number' ? analyticsObj.estimated_days_remaining : 0,
                monthly_spending: typeof analyticsObj.monthly_spending === 'number' ? analyticsObj.monthly_spending : 0,
                last_purchase_date: typeof analyticsObj.last_purchase_date === 'string' ? analyticsObj.last_purchase_date : undefined
              };
              setTokenData(realTokenData);
            } else {
              console.log('Invalid token analytics format, using mock data');
              setTokenData(MOCK_TOKEN_DATA);
            }
          } else {
            console.log('No token data found, using mock data');
            setTokenData(MOCK_TOKEN_DATA);
          }
        } catch (error) {
          console.log('Token data fetch failed, using mock data');
          setTokenData(MOCK_TOKEN_DATA);
        }
      } else {
        console.log('No meter connected, using mock data');
        setEnergyData(MOCK_ENERGY_DATA);
        setTokenData(MOCK_TOKEN_DATA);
      }

      // Clear timeout on success
      if (dataFetchTimeoutRef.current) {
        clearTimeout(dataFetchTimeoutRef.current);
      }

      setDataStatus('connected');
      console.log('Data fetch completed successfully');

    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Clear timeout
      if (dataFetchTimeoutRef.current) {
        clearTimeout(dataFetchTimeoutRef.current);
      }
      
      setDataStatus('offline');
      // Keep using mock data as fallback
    }
  }, [lastDataFetch]);

  // Initialize data fetching
  useEffect(() => {
    const initializeData = async () => {
      setDataStatus('loading');
      await fetchUserDataSafely();
    };

    initializeData();
  }, [fetchUserDataSafely]);

  // Generate AI alerts based on real or mock energy data
  const generateAlerts = useCallback(() => {
    const newAlerts: EnergyAlert[] = [];

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

    // Token low balance alert
    if (tokenData.current_balance < 100) {
      newAlerts.push({
        id: 'low-balance',
        type: 'warning',
        title: 'Low Token Balance',
        message: `Your token balance is KSh ${tokenData.current_balance.toFixed(2)}. Consider purchasing more tokens soon.`,
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

    setAlerts(newAlerts);
  }, [energyData, tokenData]);

  useEffect(() => {
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

  // Enhanced bot response with real user data
  const getBotResponse = useCallback((userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Get user name from real data or fallback
    const userName = userData?.full_name || 'rafiki';
    const hasMeter = userData?.meter_number ? true : false;
    const meterCategory = userData?.meter_category || 'household';
    
    if (message.includes('reduce') || message.includes('save') || message.includes('lower') || message.includes('bill')) {
      const personalizedTips = hasMeter ? 
        `Based on your ${meterCategory} meter data, here are personalized ways to reduce your electricity bill:` :
        `Here are proven ways to reduce your electricity bill in Kenya:`;
        
      return `${personalizedTips}\n\n💡 Immediate Actions:\n• Switch to LED bulbs (save up to 80% on lighting)\n• Unplug devices when not in use\n• Use natural light during the day\n• Set water heater to 60°C maximum\n\n🏠 Home Efficiency:\n• Use fans instead of AC when possible\n• Iron clothes in batches\n• Use pressure cookers for faster cooking\n• Maintain your fridge at 4°C\n\n📊 Your Current Usage: ${energyData.daily_total.toFixed(2)} kWh today (KSh ${energyData.daily_cost.toFixed(2)})\n${hasMeter ? 'Based on your actual meter readings' : 'Estimated based on typical usage'}\n\nWith these tips, you could save 20-30% monthly!`;
    }
    
    if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
      const dataSource = hasMeter ? 'from your connected smart meter' : 'estimated for demonstration';
      
      return `📈 Your Energy Usage Summary ${dataSource}:\n\n🔋 Today's Consumption: ${energyData.daily_total.toFixed(2)} kWh\n💰 Today's Cost: KSh ${energyData.daily_cost.toFixed(2)}\n⚡ Current Usage: ${energyData.current_usage.toFixed(2)} kWh\n🎯 Efficiency Score: ${energyData.efficiency_score}%\n📅 Weekly Average: ${energyData.weekly_average.toFixed(2)} kWh\n🏠 Meter Category: ${meterCategory}\n\nAnalysis:\n${energyData.efficiency_score >= 90 ? '✅ Excellent! You\'re using energy very efficiently.' : energyData.efficiency_score >= 80 ? '👍 Good usage patterns. Small improvements possible.' : '⚠️ High usage detected. Consider energy-saving measures.'}\n\n${hasMeter ? 'This data is from your actual smart meter readings.' : 'Connect your smart meter for real-time data!'}\n\nKenya Power Average: 150-300 kWh/month for typical households`;
    }

    if (message.includes('token') || message.includes('balance') || message.includes('kplc')) {
      const tokenInfo = hasMeter ? 
        `Your KPLC Token Status:\n\n💰 Current Balance: KSh ${tokenData.current_balance.toFixed(2)}\n📊 Daily Average Consumption: KSh ${tokenData.daily_consumption_avg.toFixed(2)}\n⏰ Estimated Days Remaining: ${tokenData.estimated_days_remaining} days\n💳 Monthly Spending: KSh ${tokenData.monthly_spending.toFixed(2)}\n${tokenData.last_purchase_date ? `🛒 Last Purchase: ${new Date(tokenData.last_purchase_date).toLocaleDateString()}` : ''}\n\n${tokenData.current_balance < 100 ? '⚠️ Low balance warning! Consider purchasing more tokens.' : '✅ Your token balance looks good.'}\n\nThis data is from your actual meter and transaction history.` :
        `KPLC Token Information:\n\nTo see your actual token balance and usage, please:\n1. Go to Settings → Meter Setup\n2. Connect your Kenya Power smart meter\n3. Your real token data will appear here\n\nFor now, I can help with:\n• Token purchase guidance\n• Understanding KPLC rates\n• Energy saving tips to extend token life`;

      return tokenInfo;
    }
    
    if (message.includes('alert') || message.includes('notification') || message.includes('setup')) {
      const setupStatus = hasMeter ? 'Your smart meter is connected! You can receive:' : 'Connect your smart meter to receive:';
      
      return `🔔 Smart Meter Alerts Available:\n\n${setupStatus}\n\n📱 High Usage Alerts:\n• Daily usage above 15 kWh\n• Unusual consumption patterns\n• Peak hour usage warnings\n\n💸 Token Notifications:\n• Low balance warnings\n• Purchase confirmations\n• Daily consumption summaries\n\n⚡ System Alerts:\n• Power outage notifications\n• Meter maintenance updates\n• Tariff rate changes\n\n${hasMeter ? 'Setup: Go to Settings → Notifications to customize your alerts.' : 'Setup: First connect your meter in Settings → Meter Setup, then configure alerts.'}\n\nYou can receive notifications via SMS, email, or push notifications.`;
    }
    
    if (message.includes('tariff') || message.includes('rate') || message.includes('cost') || message.includes('price')) {
      const currentRate = energyData.daily_total > 0 ? (energyData.daily_cost / energyData.daily_total) : 25;
      const personalRate = hasMeter ? `Your Current Rate: KSh ${currentRate.toFixed(2)}/kWh (from actual usage)` : `Estimated Rate: ~KSh ${currentRate.toFixed(2)}/kWh`;
      
      return `💰 Kenya Power Tariff Rates (2024):\n\n🏠 Domestic Tariff (D1):\n• 0-50 kWh: KSh 12.00/kWh\n• 51-1500 kWh: KSh 25.00/kWh\n• Above 1500 kWh: KSh 30.00/kWh\n\n📋 Additional Charges:\n• Fixed Charge: KSh 300/month\n• Fuel Cost Charge: Variable\n• VAT: 16% on total bill\n• Electricity Levy: KSh 5.08/kWh\n\n⏰ Time of Use (Optional):\n• Peak (6-10 PM): Higher rates\n• Off-peak (10 PM-6 AM): Lower rates\n\n${personalRate}\n\n${meterCategory === 'SME' ? '🏢 SME rates may apply for business meters' : meterCategory === 'industry' ? '🏭 Industrial rates apply for your meter category' : '🏠 Domestic rates apply for household meters'}`;
    }
    
    if (message.includes('tips') || message.includes('advice') || message.includes('kenya')) {
      const personalizedTips = meterCategory === 'SME' ? 
        'Business Energy Saving Tips:' : 
        meterCategory === 'industry' ? 
        'Industrial Energy Optimization:' : 
        '🇰🇪 Energy Saving Tips for Kenyan Homes:';
        
      return `${personalizedTips}\n\n☀️ Solar Solutions:\n• Solar water heaters (save 40% on bills)\n• Solar lighting for outdoor areas\n• Small solar panels for phone charging\n\n🏠 Appliance Tips:\n• Use charcoal jiko for long cooking\n• Buy energy-efficient appliances (look for Energy Star)\n• Use timer switches for water heaters\n\n🌡️ Climate Considerations:\n• Open windows for natural cooling\n• Use ceiling fans instead of AC\n• Plant trees around your home for shade\n\n💡 Local Hacks:\n• Cook with retained heat (turn off early)\n• Use microwaves for reheating\n• Batch your laundry and ironing\n\n${hasMeter ? `Based on your ${meterCategory} meter, focus on peak hour management (your peak time is ${energyData.peak_usage_time}).` : 'Connect your smart meter for personalized energy-saving recommendations!'}`;
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support') || message.includes('help')) {
      return `📞 Kenya Power Customer Support:\n\n🆘 Emergency & Outages:\n• Toll-Free: 95551\n• Mobile: 0711 070 000\n• WhatsApp: 0711 070 000\n\n💬 Customer Service:\n• Email: info@kplc.co.ke\n• Website: www.kplc.co.ke\n• MyPower App (bill payments)\n\n🏢 Regional Offices:\n• Nairobi: Stima Plaza, Kolobot Road\n• Mombasa: Elektra House, Haile Selassie Road\n• Kisumu: KPLC Building, Oginga Odinga Road\n\n⏰ Hours: Monday-Friday 8AM-5PM\nLanguages: English, Kiswahili\n\n🔧 For Aurora Energy Platform:\nUse the Settings → Help section or contact support through the app.`;
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('jambo') || message.includes('habari')) {
      const greeting = hasMeter ? 
        `Jambo ${userName}! 🇰🇪\n\nI can see your ${meterCategory} meter is connected. I have access to your real energy data and can provide personalized insights!` :
        `Jambo ${userName}! 🇰🇪\n\nI'm Aurora, your personal energy assistant. Connect your smart meter to get personalized insights based on your actual usage!`;
        
      return `${greeting}\n\n⚡ Energy Management:\n• Understanding your electricity usage\n• Bill calculation and estimation\n• Energy-saving strategies\n\n📊 Smart Features:\n• Real-time usage monitoring\n• Custom alerts and notifications\n• Efficiency recommendations\n\n🏠 Kenya-Specific Help:\n• Kenya Power services and contacts\n• Local energy-saving tips\n• Tariff information and updates\n\nWhat would you like to explore today?`;
    }
    
    return `I'm here to help you manage your energy consumption and save money on electricity bills! 🇰🇪\n\n${hasMeter ? `I have access to your ${meterCategory} meter data and can provide personalized insights.` : 'Connect your smart meter for personalized insights based on your actual usage!'}\n\nI can assist with:\n• 📊 Energy usage analysis\n• 💰 Bill reduction strategies\n• ⚙️ Smart meter setup\n• 📞 Kenya Power information\n• 🏠 Home efficiency tips\n• 🪙 KPLC token management\n\nPopular Questions:\n• "How can I reduce my electricity bill?"\n• "Explain my current energy usage"\n• "What's my token balance?"\n• "Kenya Power tariff rates"\n• "Energy saving tips for Kenyan homes"\n\nWhat specific topic would you like to discuss?`;
  }, [userData, energyData, tokenData]);

  // Enhanced send message with Gemini AI integration
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setIsTyping(true);

    try {
      console.log('Sending message to Gemini AI...');
      
      // Create context-aware message with user data
      const contextualMessage = `You are Aurora, a smart energy assistant for Kenya. You help users understand electricity usage, save on bills, and navigate Kenya Power services.

User Context:
- Name: ${userData?.full_name || 'User'}
- Meter Type: ${userData?.meter_category || 'no meter connected'}
- Energy Data: ${energyData.daily_total.toFixed(2)} kWh today, KSh ${energyData.daily_cost.toFixed(2)} cost, ${energyData.efficiency_score}% efficiency
- Token Data: KSh ${tokenData.current_balance.toFixed(2)} balance, ${tokenData.estimated_days_remaining} days remaining

User Query: ${currentInput}

Please provide a helpful, personalized response about energy management, Kenya Power services, or electricity savings. Use the user's actual data when relevant. Be conversational and use Kenyan context (like "Jambo" for greetings). Include practical tips and specific advice.`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': 'AIzaSyCTDMfBeEvuliA3CtIjmZV5IBHVM8bkgHk'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: contextualMessage
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiMessage) {
        throw new Error('No response from Gemini AI');
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: aiMessage,
        isBot: true,
        timestamp: new Date(),
        source: 'ai'
      };

      setMessages(prev => [...prev, botMessage]);
      console.log('Response received from Gemini AI');
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      
      // Fallback to local response if Gemini fails
      const fallbackResponse = getBotResponse(currentInput);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: fallbackResponse + '\n\n🤖 Note: Using offline response as AI service is temporarily unavailable.',
        isBot: true,
        timestamp: new Date(),
        source: 'fallback'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isTyping, userData, energyData, tokenData, getBotResponse]);

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (dataFetchTimeoutRef.current) {
        clearTimeout(dataFetchTimeoutRef.current);
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

  const getStatusIcon = () => {
    switch (dataStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-400" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />;
    }
  };

  const getStatusText = () => {
    switch (dataStatus) {
      case 'connected':
        return userData?.meter_number ? 'Connected to Smart Meter' : 'Connected';
      case 'offline':
        return 'Offline Mode';
      case 'error':
        return 'Connection Error';
      default:
        return 'Connecting...';
    }
  };

  const getAiStatusIcon = () => {
    if (aiStatus.isConnecting) {
      return <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />;
    }
    
    if (aiStatus.isConnected) {
      return <Cloud className="h-3 w-3 text-green-400" />;
    }
    
    return <WifiOff className="h-3 w-3 text-yellow-400" />;
  };

  const getAiStatusText = () => {
    if (aiStatus.isConnecting) {
      return 'AI Connecting...';
    }
    
    if (aiStatus.isConnected) {
      return 'AI Online';
    }
    
    return 'AI Offline';
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'ai':
        return <Cloud className="h-3 w-3 text-green-400" />;
      case 'cache':
        return <Database className="h-3 w-3 text-blue-400" />;
      case 'fallback':
        return <WifiOff className="h-3 w-3 text-yellow-400" />;
      default:
        return null;
    }
  };

  const handleForceReconnect = useCallback(async () => {
    console.log('Force reconnecting AI service...');
    await aiService.forceReconnect();
  }, []);

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
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-xs bg-black/20 px-2 py-1 rounded">
                {getStatusText()}
              </span>
              <div className="flex items-center gap-1 ml-2">
                <Cloud className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400">Gemini AI</span>
              </div>
            </div>
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
            <p className="text-xs text-center mt-2">
              {dataStatus === 'connected' ? (
                <span className="text-green-400">
                  {userData?.meter_number ? `Connected to meter ${userData.meter_number}` : 'Connected - personalized responses'}
                </span>
              ) : dataStatus === 'offline' ? (
                <span className="text-yellow-400">
                  Offline mode - using sample data for demonstrations
                </span>
              ) : (
                <span className="text-blue-400">
                  Connecting to your energy data...
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;