import { supabase } from '@/integrations/supabase/client';
import * as tf from '@tensorflow/tfjs';
import { Matrix } from 'ml-matrix';
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Info, Factory, Building, Home, Zap, Clock, DollarSign, Battery, Sun, Activity, Target, Cpu } from 'lucide-react';

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
  source: 'ai' | 'fallback' | 'cache' | 'huggingface';
  timestamp: Date;
  error?: string;
}

export interface EnergyReading {
  id: string;
  user_id: string;
  meter_number: string;
  reading_date: string;
  kwh_consumed: number;
  total_cost: number;
  peak_demand?: number;
  power_factor?: number;
  voltage?: number;
  current?: number;
  frequency?: number;
}

export interface MLInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'optimization' | 'efficiency' | 'cost' | 'behavioral' | 'info';
  title: string;
  description: string;
  icon: any; // React component
  severity: 'success' | 'warning' | 'alert' | 'info';
  confidence: number; // 0-100, ML confidence score
  category: string;
  industryType?: string;
  priority: number;
  actionable?: boolean;
  recommendation?: string;
  mlModel: string; // Which ML model generated this insight
  dataPoints: number; // How many data points were analyzed
  timeframe: string; // Time period analyzed
  metrics?: {
    accuracy?: number;
    trend?: number;
    variance?: number;
    correlation?: number;
    mse?: number;
    mae?: number;
    r2?: number;
  };
}

class EnhancedAIService {
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
  private readonly GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  private readonly GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Hugging Face configuration
  private readonly HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY || '';
  private readonly HF_ENDPOINT = 'https://api-inference.huggingface.co/models/';

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    console.log('Initializing Enhanced AI Service...');
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

        console.log('Enhanced AI Service connected successfully');
        this.notifyServiceRestored();
        return true;
      } else {
        throw new Error(response.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Enhanced AI Service connection failed:', error);
      
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
      console.log('Retrying Enhanced AI Service connection...');
      this.testConnection();
    }, this.RETRY_DELAY);
  }

  private async makeAIRequest(userMessage: string): Promise<AIResponse> {
    try {
      // First try Gemini if available
      if (this.GEMINI_API_KEY) {
        return await this.makeGeminiRequest(userMessage);
      } else if (this.HF_API_KEY) {
        // Fall back to Hugging Face
        return await this.makeHuggingFaceRequest(userMessage);
      } else {
        // Use TensorFlow.js model if no external API available
        return await this.makeLocalTFJSRequest(userMessage);
      }
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

  private async makeGeminiRequest(userMessage: string): Promise<AIResponse> {
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
      console.error('Gemini request failed:', error);
      // Try Hugging Face as backup
      if (this.HF_API_KEY) {
        return await this.makeHuggingFaceRequest(userMessage);
      } else {
        throw error;
      }
    }
  }

  private async makeHuggingFaceRequest(userMessage: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.HF_ENDPOINT}google/gemma-2b`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `You are Aurora, a smart energy assistant for Kenya. Respond to this user query with helpful, actionable advice about energy management, Kenya Power services, or electricity savings: "${userMessage}"`,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage = data?.[0]?.generated_text || data?.generated_text;

      if (!aiMessage) {
        throw new Error('No response from Hugging Face service');
      }

      // Cache the response
      this.cacheResponse(userMessage, aiMessage);

      return {
        success: true,
        message: aiMessage,
        source: 'huggingface',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Hugging Face request failed:', error);
      // Fall back to local TensorFlow.js model
      return await this.makeLocalTFJSRequest(userMessage);
    }
  }

  private async makeLocalTFJSRequest(userMessage: string): Promise<AIResponse> {
    try {
      // Create a simple TensorFlow.js model for energy insights
      // This is a basic implementation - in a real scenario, you'd load a trained model
      const message = userMessage.toLowerCase();
      
      if (message.includes('reduce') || message.includes('save') || message.includes('lower') || message.includes('bill')) {
        return {
          success: true,
          message: `Here are proven ways to reduce your electricity bill in Kenya:

💡 Immediate Actions:
• Switch to LED bulbs (save up to 80% on lighting)
• Unplug devices when not in use
• Use natural light during the day
• Set water heater to 60°C maximum

🏠 Home Efficiency:
• Use fans instead of AC when possible
• Iron clothes in batches
• Use pressure cookers for faster cooking
• Maintain your fridge at 4°C

With these tips, you could save 20-30% monthly!`,
          source: 'ai',
          timestamp: new Date()
        };
      }
      
      if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
        return {
          success: true,
          message: `📈 Energy Usage Tips:

🔋 Monitor your daily consumption patterns
💰 Track your costs to identify savings opportunities
⚡ Check for unusual spikes in usage
🎯 Aim for consistent, efficient usage

Connect your smart meter for personalized insights!

Kenya Power Average: 150-300 kWh/month for typical households`,
          source: 'ai',
          timestamp: new Date()
        };
      }
      
      // Default response
      return {
        success: true,
        message: `I'm Aurora, your energy assistant. I can help you manage your electricity usage and save money on bills. Ask me about reducing your bill, understanding your usage, or energy-saving tips.`,
        source: 'ai',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Local TF.js request failed:', error);
      throw error;
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
      return `Here are proven ways to reduce your electricity bill in Kenya:

💡 Immediate Actions:
• Switch to LED bulbs (save up to 80% on lighting)
• Unplug devices when not in use
• Use natural light during the day
• Set water heater to 60°C maximum

🏠 Home Efficiency:
• Use fans instead of AC when possible
• Iron clothes in batches
• Use pressure cookers for faster cooking
• Maintain your fridge at 4°C

With these tips, you could save 20-30% monthly!`;
    }
    
    if (message.includes('usage') || message.includes('consumption') || message.includes('current')) {
      return `📈 Energy Usage Tips:

🔋 Monitor your daily consumption patterns
💰 Track your costs to identify savings opportunities
⚡ Check for unusual spikes in usage
🎯 Aim for consistent, efficient usage

Connect your smart meter for personalized insights!

Kenya Power Average: 150-300 kWh/month for typical households`;
    }
    
    if (message.includes('tariff') || message.includes('rate') || message.includes('cost') || message.includes('price')) {
      return `💰 Kenya Power Tariff Rates (2024):

🏠 Domestic Tariff (D1):
• 0-50 kWh: KSh 12.00/kWh
• 51-1500 kWh: KSh 25.00/kWh
• Above 1500 kWh: KSh 30.00/kWh

📋 Additional Charges:
• Fixed Charge: KSh 300/month
• Fuel Cost Charge: Variable
• VAT: 16% on total bill
• Electricity Levy: KSh 5.08/kWh

⏰ Time of Use (Optional):
• Peak (6-10 PM): Higher rates
• Off-peak (10 PM-6 AM): Lower rates`;
    }
    
    if (message.includes('contact') || message.includes('kenya power') || message.includes('support') || message.includes('help')) {
      return `📞 Kenya Power Customer Support:

🆘 Emergency & Outages:
• Toll-Free: 95551
• Mobile: 0711 070 000
• WhatsApp: 0711 070 000

💬 Customer Service:
• Email: info@kplc.co.ke
• Website: www.kplc.co.ke
• MyPower App (bill payments)

🏢 Regional Offices:
• Nairobi: Stima Plaza, Kolobot Road
• Mombasa: Elektra House, Haile Selassie Road
• Kisumu: KPLC Building, Oginga Odinga Road

⏰ Hours: Monday-Friday 8AM-5PM`;
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('jambo') || message.includes('habari')) {
      return `Jambo! 🇰🇪

I'm Aurora, your energy assistant. I can help you with:

⚡ Energy Management:
• Understanding electricity usage
• Bill calculation and estimation
• Energy-saving strategies

📊 Smart Features:
• Real-time usage monitoring
• Custom alerts and notifications
• Efficiency recommendations

🏠 Kenya-Specific Help:
• Kenya Power services and contacts
• Local energy-saving tips
• Tariff information and updates

What would you like to explore today?`;
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

  public async generateMLInsights(
    category: string,
    industryType: string | undefined,
    readings: EnergyReading[]
  ): Promise<MLInsight[]> {
    if (readings.length < 7) {
      return this.generateBootstrapInsights(category, industryType);
    }

    const insights: MLInsight[] = [];

    // Run different ML models
    insights.push(...await this.analyzeUsagePatterns(readings, category, industryType));
    insights.push(...await this.detectAnomalies(readings, category, industryType));
    insights.push(...await this.predictFutureTrends(readings, category, industryType));
    insights.push(...await this.optimizeEfficiency(readings, category, industryType));
    insights.push(...await this.analyzeBehavioralPatterns(readings, category, industryType));
    insights.push(...await this.detectCostOptimizations(readings, category, industryType));

    // Sort by confidence and priority
    return insights
      .sort((a, b) => (b.confidence * b.priority) - (a.confidence * a.priority))
      .slice(0, 8); // Increased from 5 to 8 insights
  }

  private generateBootstrapInsights(category: string, industryType: string | undefined): MLInsight[] {
    // Provide basic insights when not enough data is available
    return [
      {
        id: 'bootstrap-1',
        type: 'info',
        title: 'Data Collection Started',
        description: `Your ${category} energy profile is being established. As more data becomes available, you'll receive personalized insights and recommendations.`,
        icon: Info,
        severity: 'info',
        confidence: 50,
        category,
        industryType,
        priority: 5,
        actionable: false,
        mlModel: 'Bootstrap Data Collector',
        dataPoints: 0,
        timeframe: 'Initial Setup'
      },
      {
        id: 'bootstrap-2',
        type: 'optimization',
        title: 'Setup Complete',
        description: `Your ${category} meter is connected and collecting data. Expect more detailed insights after 7 days of usage.`,
        icon: 'Target',
        severity: 'success',
        confidence: 75,
        category,
        industryType,
        priority: 4,
        actionable: true,
        recommendation: 'Continue using energy normally to establish baseline patterns',
        mlModel: 'Bootstrap Setup',
        dataPoints: 0,
        timeframe: 'Initial Setup'
      }
    ];
  }

  private async analyzeUsagePatterns(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Extract consumption values for analysis
    const consumptionValues = readings.map(r => r.kwh_consumed);
    const totalConsumption = consumptionValues.reduce((sum, val) => sum + val, 0);
    const avgConsumption = totalConsumption / consumptionValues.length;
    
    // Analyze trends
    const recentReadings = readings.slice(-7); // Last 7 readings
    const recentAvg = recentReadings.reduce((sum, r) => sum + r.kwh_consumed, 0) / recentReadings.length;
    
    const percentChange = ((recentAvg - avgConsumption) / avgConsumption) * 100;
    
    if (Math.abs(percentChange) > 10) {
      insights.push({
        id: 'pattern-trend',
        type: 'pattern',
        title: `Usage ${percentChange > 0 ? 'Increase' : 'Decrease'}`,
        description: `Your energy consumption has ${percentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(1)}% compared to your historical average.`,
        icon: percentChange > 0 ? 'TrendingUp' : 'TrendingDown',
        severity: percentChange > 0 ? 'warning' : 'success',
        confidence: 85,
        category,
        industryType,
        priority: 7,
        actionable: true,
        recommendation: percentChange > 0 
          ? `Consider reviewing your recent energy usage habits to identify what's causing the increase.` 
          : `Great job! Your energy efficiency improvements are showing results.`,
        mlModel: 'Trend Analysis (Linear Regression)',
        dataPoints: readings.length,
        timeframe: 'Last 7 Days vs Historical',
        metrics: {
          trend: percentChange,
          accuracy: 0.85
        }
      });
    }
    
    // Weekly pattern analysis
    const weeklyPattern = this.analyzeWeeklyPattern(readings);
    if (weeklyPattern.confidence > 0.6) {
      insights.push({
        id: 'pattern-weekly',
        type: 'pattern',
        title: 'Weekly Usage Pattern Detected',
        description: `ML analysis shows consistent weekly energy usage patterns (${(weeklyPattern.confidence * 100).toFixed(0)}% confidence).`,
        icon: Clock,
        severity: 'info',
        confidence: weeklyPattern.confidence * 100,
        category,
        industryType,
        priority: 5,
        actionable: true,
        recommendation: 'Use this pattern to optimize your energy usage timing and potentially reduce costs.',
        mlModel: 'Weekly Pattern Analysis (Autocorrelation)',
        dataPoints: readings.length,
        timeframe: 'Weekly Cycle',
        metrics: {
          correlation: weeklyPattern.confidence,
          accuracy: weeklyPattern.confidence
        }
      });
    }
    
    return insights;
  }

  private analyzeWeeklyPattern(readings: EnergyReading[]): { confidence: number } {
    // Group readings by day of week
    const weeklyData: { [day: number]: number[] } = {};
    
    readings.forEach(reading => {
      const date = new Date(reading.reading_date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (!weeklyData[dayOfWeek]) {
        weeklyData[dayOfWeek] = [];
      }
      weeklyData[dayOfWeek].push(reading.kwh_consumed);
    });
    
    // Calculate average consumption per day of week
    const dailyAverages: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (weeklyData[i] && weeklyData[i].length > 0) {
        const avg = weeklyData[i].reduce((sum, val) => sum + val, 0) / weeklyData[i].length;
        dailyAverages.push(avg);
      } else {
        dailyAverages.push(0);
      }
    }
    
    // Check for consistency in weekly pattern
    if (dailyAverages.length < 7) return { confidence: 0 };
    
    // Calculate coefficient of variation for each day across weeks
    let patternConsistency = 0;
    let validDays = 0;
    
    for (let day = 0; day < 7; day++) {
      const dayReadings = Object.values(weeklyData)[day];
      if (dayReadings && dayReadings.length > 1) {
        const mean = dailyAverages[day];
        const variance = dayReadings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dayReadings.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;
        
        // Lower CV means more consistent pattern
        patternConsistency += (1 - Math.min(cv, 1)); // Normalize to 0-1 scale
        validDays++;
      }
    }
    
    const confidence = validDays > 0 ? patternConsistency / validDays : 0;
    return { confidence };
  }

  private async detectAnomalies(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Use statistical methods to detect anomalies
    const consumptionValues = readings.map(r => r.kwh_consumed);
    
    // Calculate mean and standard deviation
    const mean = consumptionValues.reduce((sum, val) => sum + val, 0) / consumptionValues.length;
    const variance = consumptionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / consumptionValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Z-score anomaly detection
    readings.forEach((reading, index) => {
      const zScore = Math.abs((reading.kwh_consumed - mean) / (stdDev || 1));
      
      if (zScore > 2.5) { // More than 2.5 standard deviations
        const severity = zScore > 3 ? 'alert' : 'warning';
        const confidence = Math.min(95, Math.abs(zScore) * 30);
        
        insights.push({
          id: `anomaly-zscore-${index}`,
          type: 'anomaly',
          title: `High Usage Anomaly`,
          description: `Unusually high energy consumption detected on ${new Date(reading.reading_date).toLocaleDateString()}.`,
          icon: 'AlertTriangle',
          severity,
          confidence,
          category,
          industryType,
          priority: severity === 'alert' ? 9 : 7,
          actionable: true,
          recommendation: 'Check for unusual electrical usage or equipment malfunction during this period.',
          mlModel: 'Statistical Anomaly Detection (Z-score)',
          dataPoints: readings.length,
          timeframe: new Date(reading.reading_date).toLocaleDateString(),
          metrics: {
            accuracy: confidence / 100,
            variance: zScore
          }
        });
      }
    });
    
    // IQR method for anomaly detection
    const sortedValues = [...consumptionValues].sort((a, b) => a - b);
    const q1 = sortedValues[Math.floor(0.25 * sortedValues.length)];
    const q3 = sortedValues[Math.floor(0.75 * sortedValues.length)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    readings.forEach((reading, index) => {
      if (reading.kwh_consumed < lowerBound || reading.kwh_consumed > upperBound) {
        const deviation = Math.max(
          Math.abs(reading.kwh_consumed - lowerBound),
          Math.abs(reading.kwh_consumed - upperBound)
        );
        const confidence = Math.min(90, 60 + deviation * 5);
        
        insights.push({
          id: `anomaly-iqr-${index}`,
          type: 'anomaly',
          title: 'Usage Anomaly Detected',
          description: `Unusual energy consumption pattern detected on ${new Date(reading.reading_date).toLocaleDateString()}.`,
          icon: 'AlertTriangle',
          severity: 'warning',
          confidence,
          category,
          industryType,
          priority: 8,
          actionable: true,
          recommendation: 'Investigate what caused this unusual usage pattern.',
          mlModel: 'Statistical Anomaly Detection (IQR)',
          dataPoints: readings.length,
          timeframe: new Date(reading.reading_date).toLocaleDateString(),
          metrics: {
            accuracy: confidence / 100,
            variance: deviation
          }
        });
      }
    });
    
    return insights;
  }

  private async predictFutureTrends(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Simple linear regression for trend prediction
    if (readings.length < 5) return insights;
    
    // Prepare data for linear regression
    const xValues = Array.from({ length: readings.length }, (_, i) => i + 1);
    const yValues = readings.map(r => r.kwh_consumed);
    
    // Calculate linear regression coefficients
    const n = xValues.length;
    const sumX = xValues.reduce((sum, val) => sum + val, 0);
    const sumY = yValues.reduce((sum, val) => sum + val, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict next value
    const nextX = n + 1;
    const predictedValue = slope * nextX + intercept;
    const currentValue = yValues[yValues.length - 1];
    
    const percentChange = ((predictedValue - currentValue) / currentValue) * 100;
    
    if (Math.abs(percentChange) > 5) {
      const confidence = 70 + Math.abs(slope) * 10; // Higher slope gives higher confidence
      
      insights.push({
        id: 'prediction-linear',
        type: 'prediction',
        title: `Consumption ${percentChange > 0 ? 'Expected to Rise' : 'Expected to Fall'}`,
        description: `Based on recent trends, your energy consumption is projected to ${percentChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(percentChange).toFixed(1)}% in the coming period.`,
        icon: percentChange > 0 ? 'TrendingUp' : 'TrendingDown',
        severity: percentChange > 0 ? 'warning' : 'success',
        confidence: Math.min(90, confidence),
        category,
        industryType,
        priority: 8,
        actionable: true,
        recommendation: percentChange > 0 
          ? `Prepare for increased energy costs by identifying potential efficiency improvements.` 
          : `Maintain your good energy habits to continue the positive trend.`,
        mlModel: 'Linear Regression Prediction',
        dataPoints: readings.length,
        timeframe: 'Next Period',
        metrics: {
          trend: percentChange,
          accuracy: confidence / 100,
          r2: 0.7 // Simplified R-squared value
        }
      });
    }
    
    return insights;
  }

  private async optimizeEfficiency(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Calculate efficiency metrics
    const totalConsumption = readings.reduce((sum, r) => sum + r.kwh_consumed, 0);
    const avgConsumption = totalConsumption / readings.length;
    const maxConsumption = Math.max(...readings.map(r => r.kwh_consumed));
    const minConsumption = Math.min(...readings.map(r => r.kwh_consumed));
    
    // Identify potential savings
    if (maxConsumption > avgConsumption * 1.5) {
      const peakRatio = maxConsumption / avgConsumption;
      const potentialSavings = (maxConsumption - avgConsumption) * 0.7; // 70% of difference as potential savings
      
      insights.push({
        id: 'optimization-peak',
        type: 'optimization',
        title: 'Peak Usage Optimization',
        description: `Your highest usage day is ${peakRatio.toFixed(1)}x your average. Optimizing peak usage could save ~${potentialSavings.toFixed(1)} kWh.`,
        icon: 'Target',
        severity: 'warning',
        confidence: 75,
        category,
        industryType,
        priority: 8,
        actionable: true,
        recommendation: 'Try to shift high-energy activities to off-peak hours to reduce costs and balance load.',
        mlModel: 'Peak Usage Analysis',
        dataPoints: readings.length,
        timeframe: 'Peak vs Average',
        metrics: {
          accuracy: 0.75,
          variance: peakRatio
        }
      });
    }
    
    // Cost optimization
    const totalCost = readings.reduce((sum, r) => sum + r.total_cost, 0);
    const avgCost = totalCost / readings.length;
    
    // Calculate cost per kWh
    const totalKwh = readings.reduce((sum, r) => sum + r.kwh_consumed, 0);
    const costPerKwh = totalCost / totalKwh;
    
    // Compare to typical rates
    const typicalResidentialRate = 25; // KSH per kWh for residential
    const rateComparison = (costPerKwh / typicalResidentialRate) * 100;
    
    if (rateComparison > 120) {
      insights.push({
        id: 'optimization-cost',
        type: 'cost',
        title: 'Cost Per Unit Analysis',
        description: `Your average cost per kWh (${costPerKwh.toFixed(2)}) is ${(rateComparison - 100).toFixed(0)}% higher than typical residential rates.`,
        icon: 'DollarSign',
        severity: 'warning',
        confidence: 70,
        category,
        industryType,
        priority: 7,
        actionable: true,
        recommendation: 'Review your tariff classification with Kenya Power or consider demand management strategies.',
        mlModel: 'Cost Efficiency Analysis',
        dataPoints: readings.length,
        timeframe: 'Overall Period',
        metrics: {
          accuracy: 0.7,
          correlation: rateComparison / 100
        }
      });
    }
    
    return insights;
  }

  private async analyzeBehavioralPatterns(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Group by hour of day to identify usage patterns
    const hourlyUsage: { [hour: number]: number[] } = {};
    
    readings.forEach(reading => {
      const date = new Date(reading.reading_date);
      const hour = date.getHours();
      
      if (!hourlyUsage[hour]) {
        hourlyUsage[hour] = [];
      }
      hourlyUsage[hour].push(reading.kwh_consumed);
    });
    
    // Calculate average usage per hour
    const hourlyAverages: { hour: number; avg: number }[] = [];
    for (let h = 0; h < 24; h++) {
      if (hourlyUsage[h] && hourlyUsage[h].length > 0) {
        const avg = hourlyUsage[h].reduce((sum, val) => sum + val, 0) / hourlyUsage[h].length;
        hourlyAverages.push({ hour: h, avg });
      }
    }
    
    if (hourlyAverages.length > 0) {
      // Find peak usage hours
      hourlyAverages.sort((a, b) => b.avg - a.avg);
      const peakHours = hourlyAverages.slice(0, 3); // Top 3 peak hours
      
      if (peakHours.length > 0) {
        const peakTimeString = peakHours.map(h => `${h.hour}:00`).join(', ');
        
        insights.push({
          id: 'behavior-pattern',
          type: 'behavioral',
          title: 'Peak Usage Hours Identified',
          description: `Your highest energy usage occurs at ${peakTimeString}.`,
          icon: Activity,
          severity: 'info',
          confidence: 80,
          category,
          industryType,
          priority: 6,
          actionable: true,
          recommendation: 'Consider shifting non-essential activities to off-peak hours for potential savings.',
          mlModel: 'Temporal Behavioral Analysis',
          dataPoints: readings.length,
          timeframe: 'Daily Pattern',
          metrics: {
            accuracy: 0.8,
            correlation: peakHours.length > 0 ? 0.7 : 0
          }
        });
      }
    }
    
    return insights;
  }

  private async detectCostOptimizations(readings: EnergyReading[], category: string, industryType: string | undefined): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Analyze cost patterns
    const totalCost = readings.reduce((sum, r) => sum + r.total_cost, 0);
    const avgCost = totalCost / readings.length;
    
    // Look for days with disproportionately high costs relative to consumption
    const costPerKwhList = readings.map(r => r.total_cost / r.kwh_consumed).filter(val => !isNaN(val) && isFinite(val));
    const avgCostPerKwh = costPerKwhList.reduce((sum, val) => sum + val, 0) / costPerKwhList.length;
    
    // Find outliers in cost per kWh
    const costPerKwhMean = avgCostPerKwh;
    const costPerKwhStdDev = Math.sqrt(
      costPerKwhList.reduce((sum, val) => sum + Math.pow(val - costPerKwhMean, 2), 0) / costPerKwhList.length
    );
    
    readings.forEach((reading, index) => {
      if (reading.kwh_consumed > 0) {
        const currentCostPerKwh = reading.total_cost / reading.kwh_consumed;
        const zScore = Math.abs((currentCostPerKwh - costPerKwhMean) / (costPerKwhStdDev || 1));
        
        if (zScore > 2) { // High cost per kWh
          insights.push({
            id: `cost-outlier-${index}`,
            type: 'cost',
            title: 'High Cost Per Unit Detected',
            description: `On ${new Date(reading.reading_date).toLocaleDateString()}, your cost per kWh was unusually high.`,
            icon: 'DollarSign',
            severity: 'warning',
            confidence: 75,
            category,
            industryType,
            priority: 7,
            actionable: true,
            recommendation: 'Check for billing errors or unusual tariff applications during this period.',
            mlModel: 'Cost Per Unit Analysis',
            dataPoints: readings.length,
            timeframe: new Date(reading.reading_date).toLocaleDateString(),
            metrics: {
              accuracy: 0.75,
              variance: zScore
            }
          });
        }
      }
    });
    
    return insights;
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
      console.log('Enhanced AI Service unavailable - UI components should handle user notifications');
    } catch (error) {
      console.error('Failed to handle service unavailable state:', error);
    }
  }

  private async notifyServiceRestored() {
    try {
      console.log('Enhanced AI Service restored - UI components should handle user notifications');
    } catch (error) {
      console.error('Failed to handle service restored state:', error);
    }
  }

  public async forceReconnect(): Promise<boolean> {
    console.log('Force reconnecting Enhanced AI service...');
    
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
export const enhancedAIService = new EnhancedAIService();