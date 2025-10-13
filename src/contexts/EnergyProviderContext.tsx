import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

// Provider configuration interface
// Updated to include Energy Credits, Energy Management, and Device Setup
interface ProviderConfig {
  name: string;
  type: 'grid' | 'solar' | 'hybrid';
  features: string[];
  terminology: {
    device: 'meter' | 'inverter';
    credits: 'tokens' | 'credits';
    payment: 'prepaid' | 'postpaid' | 'paygo';
    setup: 'Meter Setup' | 'Inverter Setup' | 'Device Setup';
    dashboard: 'KPLC Tokens' | 'Pay as You Go' | 'Solar Credits' | 'Energy Credits' | 'Energy Management';
  };
  settings: {
    supportsBatteries: boolean;
    supportsInverters: boolean;
    supportsTokens: boolean;
    supportsPayAsYouGo: boolean;
    defaultRate: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  icon: string;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  'KPLC': {
    name: 'Kenya Power (KPLC)',
    type: 'grid',
    features: ['tokens', 'prepaid', 'smart_meter'],
    terminology: {
      device: 'meter',
      credits: 'tokens',
      payment: 'prepaid',
      setup: 'Meter Setup',
      dashboard: 'KPLC Tokens'
    },
    settings: {
      supportsBatteries: false,
      supportsInverters: false,
      supportsTokens: true,
      supportsPayAsYouGo: false,
      defaultRate: 0.15
    },
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399'
    },
    icon: 'Zap'
  },
  'Solar': {
    name: 'Solar Provider',
    type: 'solar',
    features: ['solar_panels', 'batteries', 'inverters', 'paygo'],
    terminology: {
      device: 'inverter',
      credits: 'credits',
      payment: 'paygo',
      setup: 'Inverter Setup',
      dashboard: 'Pay as You Go'
    },
    settings: {
      supportsBatteries: true,
      supportsInverters: true,
      supportsTokens: false,
      supportsPayAsYouGo: true,
      defaultRate: 0.20
    },
    colors: {
      primary: '#f59e0b',
      secondary: '#d97706',
      accent: '#fbbf24'
    },
    icon: 'Sun'
  },
  'IPP': {
    name: 'Independent Power Producers',
    type: 'hybrid',
    features: ['renewable', 'industrial', 'commercial'],
    terminology: {
      device: 'meter',
      credits: 'credits',
      payment: 'postpaid',
      setup: 'Meter Setup',
      dashboard: 'Energy Credits'
    },
    settings: {
      supportsBatteries: true,
      supportsInverters: true,
      supportsTokens: false,
      supportsPayAsYouGo: true,
      defaultRate: 0.16
    },
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#a78bfa'
    },
    icon: 'Factory'
  },
  'Other': {
    name: 'Other Provider',
    type: 'hybrid',
    features: ['flexible'],
    terminology: {
      device: 'meter',
      credits: 'credits',
      payment: 'prepaid',
      setup: 'Device Setup',
      dashboard: 'Energy Management'
    },
    settings: {
      supportsBatteries: true,
      supportsInverters: true,
      supportsTokens: true,
      supportsPayAsYouGo: true,
      defaultRate: 0.15
    },
    colors: {
      primary: '#6b7280',
      secondary: '#4b5563',
      accent: '#9ca3af'
    },
    icon: 'Settings'
  }
};

// Context interface
interface EnergyProviderContextType {
  provider: string;
  setProvider: (provider: string) => Promise<boolean>;
  providerConfig: ProviderConfig;
  isLoading: boolean;
  error: string | null;
  refreshProvider: () => Promise<void>;
  getProviderConfig: (provider: string) => ProviderConfig;
  availableProviders: string[];
}

// Create context
const EnergyProviderContext = createContext<EnergyProviderContextType | undefined>(undefined);

// Provider component
interface EnergyProviderProviderProps {
  children: ReactNode;
}

export const EnergyProviderProvider: React.FC<EnergyProviderProviderProps> = ({ children }) => {
  const [provider, setProviderState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get provider configuration
  const getProviderConfig = useCallback((providerName: string): ProviderConfig => {
    return PROVIDER_CONFIGS[providerName] || PROVIDER_CONFIGS['KPLC'];
  }, []);

  // Current provider configuration
  const providerConfig = getProviderConfig(provider);

  // Available providers
  const availableProviders = Object.keys(PROVIDER_CONFIGS);

  // Fetch current provider from database
  const refreshProvider = useCallback(async () => {
    if (!user) {
      setProviderState('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('energy_provider')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching provider:', error);
        setError('Failed to fetch energy provider');
        // Use cached provider as fallback
        const cachedProvider = localStorage.getItem('energyProvider');
        if (cachedProvider) {
          setProviderState(cachedProvider);
        }
      } else {
        const fetchedProvider = data?.energy_provider || '';
        setProviderState(fetchedProvider);
        // Cache the provider
        if (fetchedProvider) {
          localStorage.setItem('energyProvider', fetchedProvider);
        }
      }
    } catch (error) {
      console.error('Exception fetching provider:', error);
      setError('Failed to fetch energy provider');
      // Use cached provider as fallback
      const cachedProvider = localStorage.getItem('energyProvider');
      if (cachedProvider) {
        setProviderState(cachedProvider);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Set provider and update database
  const setProvider = useCallback(async (newProvider: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to change your energy provider.",
        variant: "destructive"
      });
      return false;
    }

    // Validate provider
    if (newProvider && !PROVIDER_CONFIGS[newProvider]) {
      toast({
        title: "Invalid Provider",
        description: "Please select a valid energy provider.",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          energy_provider: newProvider,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating provider:', error);
        setError('Failed to update energy provider');
        toast({
          title: "Update Failed",
          description: "Failed to update your energy provider. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      // Update local state
      setProviderState(newProvider);
      
      // Cache the provider
      if (newProvider) {
        localStorage.setItem('energyProvider', newProvider);
      } else {
        localStorage.removeItem('energyProvider');
      }

      // Dispatch custom event for components that need to react
      window.dispatchEvent(new CustomEvent('energyProviderChanged', { 
        detail: { provider: newProvider, config: getProviderConfig(newProvider) }
      }));

      toast({
        title: "Provider Updated",
        description: `Successfully switched to ${getProviderConfig(newProvider).name}.`,
      });

      return true;
    } catch (error) {
      console.error('Exception updating provider:', error);
      setError('Failed to update energy provider');
      toast({
        title: "Update Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, getProviderConfig]);

  // Initialize provider on mount
  useEffect(() => {
    if (user) {
      refreshProvider();
    } else {
      setProviderState('');
      setError(null);
    }
  }, [user, refreshProvider]);

  // Load cached provider immediately for better UX
  useEffect(() => {
    const cachedProvider = localStorage.getItem('energyProvider');
    if (cachedProvider && !provider) {
      setProviderState(cachedProvider);
    }
  }, [provider]);

  const contextValue: EnergyProviderContextType = {
    provider,
    setProvider,
    providerConfig,
    isLoading,
    error,
    refreshProvider,
    getProviderConfig,
    availableProviders
  };

  return (
    <EnergyProviderContext.Provider value={contextValue}>
      {children}
    </EnergyProviderContext.Provider>
  );
};

// Hook to use the context
export const useEnergyProvider = (): EnergyProviderContextType => {
  const context = useContext(EnergyProviderContext);
  if (context === undefined) {
    throw new Error('useEnergyProvider must be used within an EnergyProviderProvider');
  }
  return context;
};

// Export provider configurations for use in other components
export { PROVIDER_CONFIGS };
export type { ProviderConfig };