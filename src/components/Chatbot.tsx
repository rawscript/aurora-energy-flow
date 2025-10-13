import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User, Zap, Calculator, Settings, TrendingUp, RefreshCw, Wifi, WifiOff, Database, Cloud } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';
import { aiService, AIServiceStatus, AIResponse } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  source?: 'ai' | 'fallback' | 'cache';
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Jambo! I'm Aurora, your smart energy assistant for Kenya. I can help you understand your electricity usage, save on bills, and navigate Kenya Power services. What would you like to know?",
      isBot: true,
      timestamp: new Date(),
      source: 'ai'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIServiceStatus>(aiService.getStatus());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { energyData } = useRealTimeEnergy();

  // Subscribe to AI service status changes
  useEffect(() => {
    const unsubscribe = aiService.onStatusChange((status) => {
      setAiStatus(status);
    });

    return unsubscribe;
  }, []);

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
    setIsTyping(true);

    try {
      console.log('Sending message to AI service...');
      const response: AIResponse = await aiService.sendMessage(currentInput);

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: response.message,
        isBot: true,
        timestamp: response.timestamp,
        source: response.source
      };

      setMessages(prev => [...prev, botMessage]);
      console.log(`Response received from ${response.source}`);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: '⚠️ I encountered an issue processing your request. Please try again or contact support if the problem persists.',
        isBot: true,
        timestamp: new Date(),
        source: 'fallback'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isTyping]);

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

  const handleForceReconnect = useCallback(async () => {
    console.log('Force reconnecting AI service...');
    await aiService.forceReconnect();
  }, []);

  const getStatusIcon = () => {
    if (aiStatus.isConnecting) {
      return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
    }
    
    if (aiStatus.isConnected) {
      return <Wifi className="h-4 w-4 text-green-400" />;
    }
    
    return <WifiOff className="h-4 w-4 text-yellow-400" />;
  };

  const getStatusText = () => {
    if (aiStatus.isConnecting) {
      return 'Connecting...';
    }
    
    if (aiStatus.isConnected) {
      return 'AI Connected';
    }
    
    return 'Offline Mode';
  };

  const getStatusColor = () => {
    if (aiStatus.isConnecting) {
      return 'text-blue-400';
    }
    
    if (aiStatus.isConnected) {
      return 'text-green-400';
    }
    
    return 'text-yellow-400';
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-aurora-green hover:bg-aurora-green-light shadow-lg relative"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {!aiStatus.isConnected && !aiStatus.isConnecting && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <WifiOff className="h-2 w-2 text-white" />
            </div>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-xl z-50 bg-slate-900 border-aurora-green/20">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-aurora-gradient">
        <CardTitle className="text-white font-medium flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Aurora Assistant 🇰🇪
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Connection Status Banner */}
        {aiStatus.error && !aiStatus.isConnected && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-yellow-400">
                  AI insights unavailable - using offline responses
                </span>
              </div>
              <Button
                onClick={handleForceReconnect}
                size="sm"
                variant="ghost"
                className="text-yellow-400 hover:bg-yellow-500/20 h-6 px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              {message.isBot && (
                <div className="w-8 h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="flex flex-col max-w-[80%]">
                <div
                  className={`p-3 rounded-lg text-sm break-words ${
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
                  {message.isBot ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-aurora-green-light">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-aurora-green-light">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-aurora-green-light">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-aurora-green-light">{children}</h3>,
                          code: ({ children }) => <code className="bg-slate-700 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-aurora-green pl-2 italic">{children}</blockquote>
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-line">{message.text}</span>
                  )}
                </div>
                {message.isBot && message.source && (
                  <div className="flex items-center gap-1 mt-1 ml-2">
                    {getSourceIcon(message.source)}
                    <span className="text-xs text-gray-500">
                      {message.source === 'ai' ? 'AI Response' : 
                       message.source === 'cache' ? 'Cached' : 
                       'Offline Mode'}
                    </span>
                  </div>
                )}
              </div>
              {!message.isBot && (
                <div className="w-8 h-8 rounded-full bg-aurora-blue-light flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-aurora-green flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-slate-800 text-gray-200 p-3 rounded-lg rounded-tl-none text-sm">
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
                  disabled={isTyping}
                >
                  <action.icon className="h-3 w-3" />
                  <span className="truncate">{action.text}</span>
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
              onKeyDown={handleKeyPress}
              placeholder="Ask about energy saving, bills, Kenya Power..."
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 text-sm"
              disabled={isTyping}
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-aurora-green hover:bg-aurora-green-light h-9 w-9"
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-center">
              {aiStatus.isConnected ? (
                <span className="text-green-400">
                  AI insights available - personalized responses
                </span>
              ) : aiStatus.isConnecting ? (
                <span className="text-blue-400">
                  Connecting to AI service...
                </span>
              ) : (
                <span className="text-yellow-400">
                  Offline mode - basic responses available
                </span>
              )}
            </p>
            {aiStatus.lastConnected && (
              <p className="text-xs text-gray-500">
                Last: {aiStatus.lastConnected.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chatbot;