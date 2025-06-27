
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
      text: "Hello! I'm Aurora, your energy management assistant. I'm here to help you navigate the platform and optimize your energy usage. How can I assist you today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    "How do I read my energy dashboard?",
    "Tips for reducing energy consumption",
    "How to calculate my bill?",
    "Understanding my energy insights",
    "Setting up notifications",
    "Contact Kenya Power"
  ];

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('dashboard') || message.includes('read')) {
      return "Your energy dashboard shows your current consumption, recent usage patterns, and cost breakdown. The main metrics include:\n\n• Current month usage in kWh\n• Estimated cost based on Kenya Power tariffs\n• Peak vs off-peak consumption\n• Comparison with previous months\n\nYou can view detailed charts by clicking on any metric card.";
    }
    
    if (message.includes('reduce') || message.includes('tips') || message.includes('save')) {
      return "Here are some energy-saving tips for Kenyan households:\n\n• Use energy-efficient LED bulbs\n• Unplug appliances when not in use\n• Set your water heater to 60°C maximum\n• Use natural lighting during the day\n• Run washing machines with full loads\n• Consider solar water heating\n• Use fans instead of AC when possible\n\nThese can reduce your bill by 20-30%!";
    }
    
    if (message.includes('bill') || message.includes('calculate') || message.includes('cost')) {
      return "Your bill calculation includes:\n\n• Energy charge: Based on kWh consumed\n• Fixed charge: Monthly connection fee\n• Fuel cost charge: Variable based on generation costs\n• VAT: 16% on total amount\n• Other levies as per EPRA tariffs\n\nUse our Bill Calculator tab to estimate your monthly costs based on usage patterns.";
    }
    
    if (message.includes('insights') || message.includes('understand')) {
      return "Energy Insights help you understand your consumption patterns:\n\n• Peak usage hours identification\n• Monthly trends and comparisons\n• Efficiency score based on similar households\n• Predictive alerts for high usage\n• Recommendations for optimization\n\nCheck the Insights tab for detailed analysis of your energy usage.";
    }
    
    if (message.includes('notification') || message.includes('alert') || message.includes('setting')) {
      return "You can set up various notifications in Settings:\n\n• High usage alerts\n• Bill due reminders\n• Maintenance notifications\n• Energy-saving tips\n• Outage updates\n\nGo to Settings > Notifications to customize your preferences.";
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support')) {
      return "You can contact Kenya Power through:\n\n• Customer Care: 95551 or 0711 070 000\n• WhatsApp: 0711 070 000\n• Email: info@kplc.co.ke\n• Website: www.kplc.co.ke\n• MyPower App for bill payments\n\nFor Aurora Energy platform support, use the help section in Settings.";
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('help')) {
      return `Hello ${user?.user_metadata?.full_name || 'there'}! I'm here to help you make the most of Aurora Energy. I can assist you with:\n\n• Understanding your energy dashboard\n• Energy-saving tips\n• Bill calculations\n• Using platform features\n• Kenya Power information\n\nWhat would you like to know?`;
    }
    
    return "I'm here to help you with Aurora Energy platform features, energy management tips, and Kenya Power information. You can ask me about:\n\n• Dashboard navigation\n• Energy-saving strategies\n• Bill calculations\n• Platform features\n• Kenya Power contacts\n\nWhat specific topic interests you?";
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

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputValue),
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
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
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-xl z-50 bg-slate-900 border-aurora-green/20">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-aurora-gradient">
        <CardTitle className="text-white font-medium flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Aurora Assistant
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
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              {quickActions.slice(0, 3).map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="text-xs justify-start h-8 border-slate-600 hover:bg-slate-800"
                >
                  {action}
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
              placeholder="Ask me anything about Aurora Energy..."
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
