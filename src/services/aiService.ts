// AI Service with robust connection handling and fallbacks
import { supabase } from '@/integrations/supabase/client';

export interface AIServiceStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected: Date | null;
  connectionAttempts: number;
  error: string | null;
}

export interface AIResponse {
  success: boolean;
  message: string;
  source: 'ai' | 'fallback' | 'cache';
  timestamp: Date;
  error?: string;
}

class AIServiceManager {
  private status: AIServiceStatus = {
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    connectionAttempts: 0,
    error: null
  };

  private connectionTimeout: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private statusListeners: ((status: AIServiceStatus) => void)[] = [];
  private responseCache = new Map<string, { response: string; timestamp: Date }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CONNECTION_TIMEOUT = 8000; // 8 seconds
  private readonly RETRY_DELAY = 30000; // 30 seconds

  // Gemini API configuration
  private readonly GEMINI_API_KEY = 'AIzaSyCTDMfBeEvuliA3CtIjmZV5IBHVM8bkgHk';
  private readonly GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    console.log('Initializing AI Service...');
    await this.testConnection();
  }

  private async testConnection(): Promise<boolean> {
    if (this.status.isConnecting) {
      console.log('Connection test already in progress');
      return false;
    }

    this.updateStatus({
      isConnecting: true,
      error: null
    });

    try {
      // Clear any existing timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set connection timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        this.connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.CONNECTION_TIMEOUT);
      });

      // Test with a simple query
      const testPromise = this.makeAIRequest('Hello, test connection');

      const response = await Promise.race([testPromise, timeoutPromise]);

      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      if (response.success) {
        this.updateStatus({
          isConnected: true,
          isConnecting: false,
          lastConnected: new Date(),
          connectionAttempts: 0,
          error: null
        });

        console.log('AI Service connected successfully');
        this.notifyServiceRestored();
        return true;
      } else {
        throw new Error(response.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('AI Service connection failed:', error);
      
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        connectionAttempts: this.status.connectionAttempts + 1,
        error: error instanceof Error ? error.message : 'Connection failed'
      });

      // Schedule retry if we haven't exceeded max attempts
      if (this.status.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
        this.scheduleRetry();
      } else {
        console.log('Max retry attempts reached, switching to fallback mode');
        this.notifyServiceUnavailable();
      }

      return false;
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    console.log(`Scheduling retry in ${this.RETRY_DELAY / 1000} seconds...`);
    
    this.retryTimeout = setTimeout(() => {
      console.log('Retrying AI Service connection...');
      this.testConnection();
    }, this.RETRY_DELAY);
  }

  private async makeAIRequest(userMessage: string): Promise<AIResponse> {
    try {
      const response = await fetch(this.GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Aurora, a smart energy assistant for Kenya. Respond to this user query with helpful, actionable advice about energy management, Kenya Power services, or electricity savings: "${userMessage}"`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiMessage) {
        throw new Error('No response from AI service');
      }

      // Cache the response
      this.cacheResponse(userMessage, aiMessage);

      return {
        success: true,
        message: aiMessage,
        source: 'ai',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('AI request failed:', error);
      return {
        success: false,
        message: '',
        source: 'ai',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'AI request failed'
      };
    }
  }

  private cacheResponse(query: string, response: string) {
    const cacheKey = query.toLowerCase().trim();
    this.responseCache.set(cacheKey, {
      response,
      timestamp: new Date()
    });

    // Clean old cache entries
    this.cleanCache();
  }

  private getCachedResponse(query: string): string | null {
    const cacheKey = query.toLowerCase().trim();
    const cached = this.responseCache.get(cacheKey);

    if (!cached) return null;

    // Check if cache is still valid
    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > this.CACHE_DURATION) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  private cleanCache() {
    const now = new Date();
    for (const [key, value] of this.responseCache.entries()) {
      if (now.getTime() - value.timestamp.getTime() > this.CACHE_DURATION) {
        this.responseCache.delete(key);
      }
    }
  }

  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('reduce') || message.includes('save') || message.includes('lower') || message.includes('bill')) {
      return `Here are proven ways to reduce your electricity bill in Kenya:\n\n💡 Immediate Actions:\n• Switch to LED bulbs (save up to 80% on lighting)\n• Unplug devices when not in use\n• Use natural light during the day\n• Set water heater to 60°C maximum\n\n🏠 Home Efficiency:\n• Use fans instead of AC when possible\n• Iron clothes in batches\n• Use pressure cookers for faster cooking\n• Maintain your fridge at 4°C\n\nWith these tips, you could save 20-30% monthly!`;
    }
    
    if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
      return `📈 Energy Usage Tips:\n\n🔋 Monitor your daily consumption patterns\n💰 Track your costs to identify savings opportunities\n⚡ Check for unusual spikes in usage\n🎯 Aim for consistent, efficient usage\n\nConnect your smart meter for personalized insights!\n\nKenya Power Average: 150-300 kWh/month for typical households`;
    }
    
    if (message.includes('tariff') || message.includes('rate') || message.includes('cost') || message.includes('price')) {
      return `💰 Kenya Power Tariff Rates (2024):\n\n🏠 Domestic Tariff (D1):\n• 0-50 kWh: KSh 12.00/kWh\n• 51-1500 kWh: KSh 25.00/kWh\n• Above 1500 kWh: KSh 30.00/kWh\n\n📋 Additional Charges:\n• Fixed Charge: KSh 300/month\n• Fuel Cost Charge: Variable\n• VAT: 16% on total bill\n• Electricity Levy: KSh 5.08/kWh\n\n⏰ Time of Use (Optional):\n• Peak (6-10 PM): Higher rates\n• Off-peak (10 PM-6 AM): Lower rates`;
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support') || message.includes('help')) {
      return `📞 Kenya Power Customer Support:\n\n🆘 Emergency & Outages:\n• Toll-Free: 95551\n• Mobile: 0711 070 000\n• WhatsApp: 0711 070 000\n\n💬 Customer Service:\n• Email: info@kplc.co.ke\n• Website: www.kplc.co.ke\n• MyPower App (bill payments)\n\n🏢 Regional Offices:\n• Nairobi: Stima Plaza, Kolobot Road\n• Mombasa: Elektra House, Haile Selassie Road\n• Kisumu: KPLC Building, Oginga Odinga Road\n\n⏰ Hours: Monday-Friday 8AM-5PM`;
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('jambo') || message.includes('habari')) {
      return `Jambo! 🇰🇪\n\nI'm Aurora, your energy assistant. I can help you with:\n\n⚡ Energy Management:\n• Understanding electricity usage\n• Bill calculation and estimation\n• Energy-saving strategies\n\n📊 Smart Features:\n• Real-time usage monitoring\n• Custom alerts and notifications\n• Efficiency recommendations\n\n🏠 Kenya-Specific Help:\n• Kenya Power services and contacts\n• Local energy-saving tips\n• Tariff information and updates\n\nWhat would you like to explore today?`;
    }
    
    return `I'm here to help you manage your energy consumption and save money on electricity bills! 🇰🇪\n\nI can assist with:\n• 📊 Energy usage analysis\n• 💰 Bill reduction strategies\n• ⚙️ Smart meter setup\n• 📞 Kenya Power information\n• 🏠 Home efficiency tips\n\nPopular Questions:\n• "How can I reduce my electricity bill?"\n• "What are Kenya Power tariff rates?"\n• "Energy saving tips for Kenyan homes"\n\nWhat specific topic would you like to discuss?`;
  }

  public async sendMessage(userMessage: string): Promise<AIResponse> {
    // Check cache first
    const cachedResponse = this.getCachedResponse(userMessage);
    if (cachedResponse) {
      console.log('Returning cached response');
      return {
        success: true,
        message: cachedResponse,
        source: 'cache',
        timestamp: new Date()
      };
    }

    // If AI service is connected, try AI request
    if (this.status.isConnected) {
      const aiResponse = await this.makeAIRequest(userMessage);
      
      if (aiResponse.success) {
        return aiResponse;
      } else {
        // AI request failed, mark as disconnected and fall back
        this.updateStatus({
          isConnected: false,
          error: aiResponse.error || 'AI service unavailable'
        });
        
        // Schedule reconnection attempt
        this.scheduleRetry();
      }
    }

    // Use fallback response
    console.log('Using fallback response');
    const fallbackMessage = this.getFallbackResponse(userMessage);
    
    return {
      success: true,
      message: fallbackMessage + '\n\n🤖 Note: AI insights are temporarily unavailable. You\'ll be notified when the service is restored.',
      source: 'fallback',
      timestamp: new Date()
    };
  }

  public getStatus(): AIServiceStatus {
    return { ...this.status };
  }

  public onStatusChange(callback: (status: AIServiceStatus) => void) {
    this.statusListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private updateStatus(updates: Partial<AIServiceStatus>) {
    this.status = { ...this.status, ...updates };
    this.statusListeners.forEach(callback => callback(this.status));
  }

  private async notifyServiceUnavailable() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create notification about service unavailability
      await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_title: 'AI Assistant Temporarily Unavailable',
        p_message: 'Aurora AI insights are currently unavailable. We\'re working to restore the service. You\'ll receive a notification when it\'s back online.',
        p_type: 'system_alert',
        p_priority: 'medium',
        p_metadata: {
          service: 'ai_assistant',
          status: 'unavailable',
          timestamp: new Date().toISOString()
        }
      });

      console.log('Service unavailable notification sent');
    } catch (error) {
      console.error('Failed to send service unavailable notification:', error);
    }
  }

  private async notifyServiceRestored() {
    try {
      // Only notify if we had previous connection attempts (service was down)
      if (this.status.connectionAttempts === 0) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create notification about service restoration
      await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_title: 'AI Assistant Service Restored! 🎉',
        p_message: 'Aurora AI insights are now available again. You can now get personalized energy recommendations and smart insights.',
        p_type: 'system_success',
        p_priority: 'medium',
        p_metadata: {
          service: 'ai_assistant',
          status: 'restored',
          timestamp: new Date().toISOString()
        }
      });

      console.log('Service restored notification sent');
    } catch (error) {
      console.error('Failed to send service restored notification:', error);
    }
  }

  public async forceReconnect(): Promise<boolean> {
    console.log('Force reconnecting AI service...');
    
    // Reset connection attempts
    this.updateStatus({
      connectionAttempts: 0,
      error: null
    });

    // Clear any existing timeouts
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    return await this.testConnection();
  }

  public cleanup() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.statusListeners = [];
    this.responseCache.clear();
  }
}

// Export singleton instance
export const aiService = new AIServiceManager();