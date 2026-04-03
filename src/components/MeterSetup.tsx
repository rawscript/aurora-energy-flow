import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SolarPanel from '@/components/ui/SolarPanel';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gauge, User, Phone, MapPin, History, Plus, Check, Clock, Building, Factory, Zap, AlertTriangle, Sun, Loader2 } from 'lucide-react';
import BatteryFull from '@/components/ui/BatteryFull';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeter } from '@/contexts/MeterContext';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';

interface MeterSetupProps {
  // No props needed anymore as we use context
}

const ENERGY_PROVIDERS = [
  { value: 'KPLC', label: 'Kenya Power (KPLC)', meterLabel: 'Meter Number', placeholder: 'Enter your Kenya Power meter number' },
  { value: 'Solar', label: 'Solar Provider', meterLabel: 'Inverter ID', placeholder: 'Enter your solar inverter ID' },
  { value: 'Other', label: 'Other Provider', meterLabel: 'Meter/Inverter ID', placeholder: 'Enter your meter or inverter ID' },
];

const meterFormSchema = (energyProvider: string) => z.object({
  meterNumber: energyProvider === 'KPLC'
    ? z.string().min(11, 'KPLC meter number must be 11 digits').max(11, 'KPLC meter number must be 11 digits')
    : z.string().min(5, 'Meter number must be at least 5 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  meterCategory: z.enum(['household', 'SME', 'industry']),
  industryType: z.enum(['heavyduty', 'medium', 'light']).optional(),
  energyProvider: z.string().min(1, 'Energy provider is required'),
});

type MeterFormValues = z.infer<ReturnType<typeof meterFormSchema>>;

// Meter category options
const METER_CATEGORIES = [
  { value: 'household', label: 'Household' },
  { value: 'SME', label: 'Small & Medium Enterprise (SME)' },
  { value: 'industry', label: 'Industry' },
];

// Industry type options
const INDUSTRY_TYPES = [
  { value: 'heavyduty', label: 'Heavy Duty Usage' },
  { value: 'medium', label: 'Medium Duty Usage' },
  { value: 'light', label: 'Light Duty Usage' },
];

// Simple type definitions following useRealTimeEnergy pattern
interface MeterHistory {
  id: string;
  meter_number: string;
  full_name: string;
  phone_number: string;
  location?: string;
  created_at: string;
  is_current: boolean;
  meter_category?: string;
  industry_type?: string;
}

const MeterSetup = ({ }: MeterSetupProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [meterHistory, setMeterHistory] = useState<MeterHistory[]>([]);
  const [activeTab, setActiveTab] = useState('current');
  const [showIndustryType, setShowIndustryType] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastDisconnectedMeter, setLastDisconnectedMeter] = useState<string | null>(null);


  const fetchingRef = useRef(false);

  const { user, session } = useAuth();
  const { profile, loading: profileLoading, setupMeter } = useProfile();
  const { provider, providerConfig, setProvider, isLoading: providerLoading } = useEnergyProvider();
  const { disconnectMeter } = useMeter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Wait for provider to be initialized before using it
  const currentProvider = provider || 'KPLC';
  const { hasMeterConnected, loading: energyLoading, meterStatus } = useRealTimeEnergy(currentProvider);

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema(currentProvider)),
    defaultValues: {
      meterNumber: '',
      fullName: '',
      phoneNumber: '',
      location: '',
      meterCategory: 'household',
      industryType: undefined,
      energyProvider: currentProvider,
    },
  });

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const currentMeter = profile?.meter_number;
      await disconnectMeter();
      
      // Store the meter number so we can reconnect easily
      if (currentMeter) {
        setLastDisconnectedMeter(currentMeter);
      }

      toast({
        title: "Device Disconnected",
        description: `Successfully disconnected your ${providerConfig.terminology.device}.`,
      });
      // Refresh history to ensure UI is in sync
      await fetchMeterHistory();
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast({
        title: "Disconnect Failed",
        description: "An error occurred while disconnecting the device.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    if (!lastDisconnectedMeter) return;
    
    try {
      setIsLoading(true);
      const success = await setupMeter({
        meter_number: lastDisconnectedMeter,
        meter_category: profile?.meter_category as any || 'household',
        energy_provider: provider || 'KPLC',
        industry_type: profile?.industry_type as any
      });

      if (success) {
        toast({
          title: "Device Reconnected",
          description: `Successfully reconnected your ${providerConfig.terminology.device}.`,
        });
        setLastDisconnectedMeter(null);
        await fetchMeterHistory();
      }
    } catch (error) {
      console.error("Reconnect failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle meter category change to show/hide industry type field
  const handleMeterCategoryChange = (value: string) => {
    form.setValue('meterCategory', value as 'household' | 'SME' | 'industry');

    if (value === 'industry') {
      setShowIndustryType(true);
      // Set a default value for industry type
      form.setValue('industryType', 'medium');
    } else {
      setShowIndustryType(false);
      // Clear industry type when not needed
      form.setValue('industryType', undefined);
    }
  };

  const fetchMeterHistory = useCallback(async (): Promise<void> => {
    if (!user?.id || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setHistoryLoading(true);
      console.log('Fetching meter history for user:', user.id);

      // We'll get previous meter configurations by looking at profile updates
      const { data, error } = await supabase
        .from('profiles')
        .select('meter_number, full_name, phone_number, meter_category, industry_type, updated_at')
        .eq('id', user.id)
        .not('meter_number', 'is', null);

      if (error) {
        console.error('Error fetching meter history:', error);
        return;
      }

      // For now, we'll create a simple history based on the current profile
      // In a production app, you'd have a separate meter_history table
      const currentProfile = data?.[0];
      if (currentProfile) {
        const historyItems: MeterHistory[] = [
          {
            id: '1',
            meter_number: currentProfile.meter_number,
            full_name: currentProfile.full_name || 'User',
            phone_number: currentProfile.phone_number || '',
            created_at: currentProfile.updated_at || new Date().toISOString(),
            is_current: true,
            meter_category: currentProfile.meter_category,
            industry_type: currentProfile.industry_type
          }
        ];

        // Add some example historical meters for demonstration
        // In production, these would come from actual historical data
        if (currentProfile.meter_number !== '12345678901') {
          historyItems.push({
            id: '2',
            meter_number: '12345678901',
            full_name: currentProfile.full_name || 'User',
            phone_number: currentProfile.phone_number || '',
            created_at: '2024-01-15T10:00:00Z',
            is_current: false,
            meter_category: 'household'
          });
        }

        if (currentProfile.meter_number !== '98765432109') {
          historyItems.push({
            id: '3',
            meter_number: '98765432109',
            full_name: currentProfile.full_name || 'User',
            phone_number: currentProfile.phone_number || '',
            created_at: '2024-06-20T14:30:00Z',
            is_current: false,
            meter_category: 'SME'
          });
        }

        setMeterHistory(historyItems);
      }
    } catch (error) {
      console.error('Error fetching meter history:', error);
    } finally {
      setHistoryLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]);

  // Update form when profile data loads
  useEffect(() => {
    if (profile && user && !isInitialized) {
      form.reset({
        meterNumber: profile.meter_number || '',
        fullName: profile.full_name || user?.user_metadata?.full_name || '',
        phoneNumber: profile.phone_number || user?.user_metadata?.phone_number || '',
        location: '',
        meterCategory: (profile.meter_category as 'household' | 'SME' | 'industry') || 'household',
        industryType: (profile.industry_type as 'heavyduty' | 'medium' | 'light') || undefined,
        energyProvider: profile.energy_provider || currentProvider,
      });

      // Set industry type visibility
      setShowIndustryType(profile.meter_category === 'industry');
      setIsInitialized(true);
    }
  }, [profile, user, form, isInitialized, currentProvider]);

  // Fetch meter history when user changes - only once
  useEffect(() => {
    if (user?.id && !fetchingRef.current) {
      fetchMeterHistory();
    }
  }, [user?.id, fetchMeterHistory]);

  const selectFromHistory = async (historyItem: MeterHistory): Promise<void> => {
    if (isLoading) return; // Prevent multiple simultaneous selections

    setIsLoading(true);
    try {
      console.log(`Selecting meter ${historyItem.meter_number} from history`);

      // Ensure user ID is available
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Prepare the profile data - following useRealTimeEnergy pattern
      const profileData = {
        full_name: historyItem.full_name,
        phone_number: historyItem.phone_number,
        meter_number: historyItem.meter_number,
        meter_category: historyItem.meter_category || 'household',
        industry_type: historyItem.meter_category === 'industry' ? (historyItem.industry_type || 'medium') : null,
        updated_at: new Date().toISOString()
      };

      // Update the profile with the selected meter - following useRealTimeEnergy pattern
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      // Wait a bit for the profile to update
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Meter Selected",
        description: `Successfully selected meter ${historyItem.meter_number}. Profile updated.`,
      });

      // Refresh the meter history to reflect the current selection
      await fetchMeterHistory();

      setActiveTab('current');
    } catch (error) {
      console.error('Error selecting meter:', error);
      toast({
        title: "Error",
        description: "Failed to select meter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: MeterFormValues): Promise<void> => {
    if (isLoading) return;
    
    if (!user?.id) {
      console.error('Authentication check failed: no user ID');
      toast({
        title: "Authentication Error",
        description: "Please sign in again to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Setting up meter with data:', { 
        meterNumber: data.meterNumber, 
        category: data.meterCategory, 
        provider: data.energyProvider,
        userId: user.id 
      });

      // Use the profile hook to setup meter
      const success = await setupMeter({
        meter_number: data.meterNumber,
        meter_category: data.meterCategory,
        industry_type: data.meterCategory === 'industry' ? data.industryType : undefined,
        energy_provider: data.energyProvider,
      });

      if (!success) {
        console.error('setupMeter returned false - check console for details');
        throw new Error('Failed to setup meter - please check your connection and try again');
      }

      // Also update other profile fields - following useRealTimeEnergy pattern
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          energy_provider: data.energyProvider,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Wait a bit for the profile to update
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: `${data.energyProvider} ${data.energyProvider === 'KPLC' ? 'Meter' : 'Inverter'} Setup Complete`,
        description: `Your ${data.energyProvider === 'KPLC' ? 'smart meter' : 'inverter'} has been successfully set up in Aurora Energy.`,
      });

      // Refresh the meter history to show the new meter
      await fetchMeterHistory();
      setActiveTab('current');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update meter details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="neo-card bg-[#facc15] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 neo-brutal shadow-none transform -rotate-2">
              {providerConfig.type === 'solar' ? (
                <SolarPanel className="h-6 w-6 sm:h-8 sm:w-8 text-[#facc15]" />
              ) : (
                <Gauge className="h-6 w-6 sm:h-8 sm:w-8 text-[#facc15]" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
                {providerConfig.terminology.setup}
              </CardTitle>
              <p className="text-sm font-bold text-black/70">
                {providerConfig.type === 'solar'
                  ? `Connect your ${providerConfig.terminology.device} to unlock real-time solar harvest data.`
                  : `Connect your Kenya Power smart meter to start tracking live consumption architecture.`}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full h-auto p-0 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} bg-transparent gap-2`}>
          <TabsTrigger 
            value="current" 
            className="neo-button h-12 data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:shadow-none data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px]"
          >
            <Gauge className="h-4 w-4 mr-2" />
            {isMobile ? 'DEVICE' : `ACTIVE ${providerConfig.terminology.device.toUpperCase()}`}
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="neo-button h-12 data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:shadow-none data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px]"
          >
            <History className="h-4 w-4 mr-2" />
            {isMobile ? 'LOGS' : 'HANDOFF HISTORY'}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger 
              value="new" 
              className="neo-button h-12 data-[state=active]:bg-black data-[state=active]:text-white text-xs sm:text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] data-[state=active]:shadow-none data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              PROVISION NEW
            </TabsTrigger>
          )}
        </TabsList>

        {/* Current Meter Tab */}
        <TabsContent value="current" className="space-y-6">
          {/* Show existing profile data if available */}
          {profile && (profile.full_name || profile.phone_number) && !profile.meter_number && (
            <Card className="neo-card bg-[#10b981]/20 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-black dark:text-white uppercase font-black">
                  <Check className="h-5 w-5" />
                  SAVED METADATA FOUND
                </CardTitle>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  Provisioning details detected from your account profile.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.full_name && (
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <User className="h-4 w-4" />
                    <span>NAME:</span> {profile.full_name}
                  </div>
                )}
                {profile.phone_number && (
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Phone className="h-4 w-4" />
                    <span>PHONE:</span> {profile.phone_number}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile?.meter_number ? (
            <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 border-b-2 border-black bg-slate-50 dark:bg-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black neo-brutal shadow-none text-white">
                      {providerConfig.type === 'solar' ? <SolarPanel className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase text-black dark:text-white tracking-tight">
                        {providerConfig.type === 'solar' ? `CONNECTED ${providerConfig.terminology.device.toUpperCase()}` : 'ACTIVE SMART METER'}
                      </CardTitle>
                      <div className="flex flex-wrap mt-1 gap-2">
                        {profile?.meter_category && (
                          <div className="bg-aurora-purple text-white text-[10px] font-black px-2 py-0.5 border-2 border-black uppercase">
                            {profile.meter_category === 'SME' ? 'SME' : profile.meter_category}
                          </div>
                        )}
                        <div className={`text-[10px] font-black px-2 py-0.5 border-2 border-black uppercase ${hasMeterConnected ? 'bg-aurora-green text-white' : 'bg-[#facc15] text-black animate-pulse'}`}>
                          {hasMeterConnected ? 'UPSTREAM ATTACHED' : 'SEARCHING...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 border-2 border-black mb-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-tighter text-slate-500">
                      {providerConfig.type === 'solar' ? `${providerConfig.terminology.device.toUpperCase()} ID` : 'METER SERIAL'}
                    </Label>
                    <p className="font-black text-xl text-black dark:text-white font-mono bg-white dark:bg-black p-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {profile.meter_number}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-tighter text-slate-500">ACCOUNT HOLDER</Label>
                    <p className="font-black text-xl text-black dark:text-white">{profile.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-tighter text-slate-500">CONTACT REF</Label>
                    <p className="font-black text-lg text-black dark:text-white">{profile.phone_number || 'UNSET'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-tighter text-slate-500">OPERATIONAL STATUS</Label>
                    <div className="flex items-center gap-2">
                       <div className={`w-3 h-3 border-2 border-black ${hasMeterConnected ? 'bg-aurora-green animate-pulse' : 'bg-red-500'}`}></div>
                       <span className="font-black text-black dark:text-white uppercase text-sm">
                        {hasMeterConnected ? 'UPSTREAM ATTACHED' : 'OFFLINE'}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {hasMeterConnected ? (
                    <Button
                      onClick={handleDisconnect}
                      className="neo-button bg-red-600 text-white hover:bg-black flex-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      disabled={isLoading}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      SEVER CONNECTION
                    </Button>
                  ) : (
                    <Button
                      onClick={handleReconnect}
                      className="neo-button bg-aurora-green text-white hover:bg-black flex-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      disabled={isLoading || !lastDisconnectedMeter}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      RE-ESTABLISH LINK
                    </Button>
                  )}
                  <Button
                    onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                    className="neo-button bg-white text-black hover:bg-slate-100 flex-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    SWITCH DEVICE
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="neo-card bg-[#facc15] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardContent className="p-8 text-center">
                <div className="bg-black p-4 neo-brutal shadow-none text-[#facc15] inline-block mb-6 transform rotate-3">
                  {providerConfig.type === 'solar' ? (
                    <SolarPanel className="h-12 w-12" />
                  ) : (
                    <Zap className="h-12 w-12" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-2">
                  NO HARDWARE LINKED
                </h3>
                <p className="text-sm font-bold text-black/70 mb-8 max-w-xs mx-auto">
                  {providerConfig.type === 'solar'
                    ? `Your Aurora terminal is currently standalone. Attach your ${providerConfig.terminology.device} to start receiving data.`
                    : 'System is running in simulation mode. Connect a smart meter to broadcast real consumption data.'}
                </p>
                <Button
                  onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                  className="neo-button bg-black text-white hover:bg-aurora-purple shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] w-full sm:w-auto font-black"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  INITIALIZE SETUP
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Meter History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 border-b-2 border-black bg-slate-50 dark:bg-slate-800">
              <CardTitle className="text-xl font-black uppercase text-black dark:text-white tracking-tight">
                {providerConfig.terminology.setup.replace('Setup', 'HISTORICAL LOGS')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {historyLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-black dark:text-white" />
                  <p className="font-black uppercase text-xs tracking-widest text-slate-500">RETRIEVING ARCHIVES...</p>
                </div>
              ) : meterHistory.length > 0 ? (
                <>
                  {meterHistory.map((meter) => (
                    <div
                      key={meter.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 transition-all gap-4 ${meter.is_current
                        ? 'bg-aurora-green/10 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white dark:bg-slate-800 border-black hover:translate-x-[1px] hover:translate-y-[1px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 neo-brutal shadow-none ${meter.is_current ? 'bg-black text-white' : 'bg-slate-200 text-black'}`}>
                            {providerConfig.type === 'solar' ? <SolarPanel className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-black text-lg text-black dark:text-white font-mono">
                                {meter.meter_number}
                              </p>
                              {meter.is_current && (
                                <div className="bg-black text-white text-[8px] font-black px-2 py-0.5 border-2 border-black uppercase">
                                  ACTIVE
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-500 mt-1">
                              {meter.full_name} • {meter.phone_number}
                            </p>
                            <p className="text-[10px] font-black uppercase text-slate-500">
                              {meter.location && `${meter.location} • `}
                              ATTACHED: {(() => {
                                try {
                                  if (!meter.created_at) return 'N/A';
                                  const date = new Date(meter.created_at);
                                  return date.toLocaleDateString('en-GB');
                                } catch (e) { return 'N/A'; }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!meter.is_current && (
                        <Button
                          onClick={() => selectFromHistory(meter)}
                          disabled={isLoading}
                          className="neo-button bg-black text-white hover:bg-aurora-green text-xs font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                        >
                          {isLoading ? 'SWITCHING...' : 'RE-ATTACH'}
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                    <Button
                      onClick={() => setActiveTab('new')}
                      className="neo-button w-full bg-[#facc15] text-black hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      PROVISION NEW TERMINAL
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-slate-400 opacity-50" />
                  <p className="font-black uppercase text-xs text-slate-500 mb-4 tracking-widest">NO DEPLOYMENT HISTORY FOUND</p>
                  <Button
                    onClick={() => setActiveTab('new')}
                    className="neo-button bg-white text-black hover:bg-slate-50 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    CREATE FIRST ENTRY
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Meter Tab */}
        <TabsContent value="new" className="space-y-4">
          <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 border-b-2 border-black bg-slate-50 dark:bg-slate-800">
              <CardTitle className="text-xl font-black uppercase text-black dark:text-white tracking-tight">
                {providerConfig.terminology.setup.replace('Setup', 'NEW PROVISIONING')}
              </CardTitle>
              <p className="text-sm font-bold text-slate-500">
                Register a new hardware endpoint for your account.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="energyProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Energy Provider</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setProvider(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="neo-input pl-4 bg-white dark:bg-slate-800 border-2 border-black h-12 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                  <SelectValue placeholder="Select energy provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white dark:bg-slate-800 border-2 border-black font-bold">
                                {ENERGY_PROVIDERS.map((provider) => (
                                  <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meterNumber"
                    render={({ field }) => {
                      const selectedProviderObj = ENERGY_PROVIDERS.find(p => p.value === form.watch('energyProvider')) || ENERGY_PROVIDERS[0];
                      return (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedProviderObj.meterLabel.toUpperCase()}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={selectedProviderObj.placeholder}
                              className="neo-input bg-white dark:bg-slate-800 border-2 border-black h-12 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Account Holder</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Full legal name"
                              className="neo-input bg-white dark:bg-slate-800 border-2 border-black h-12 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Reference</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0700 000 000"
                              className="neo-input bg-white dark:bg-slate-800 border-2 border-black h-12 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="meterCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Meter Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => handleMeterCategoryChange(value)}
                        >
                          <FormControl>
                            <SelectTrigger className="neo-input bg-white dark:bg-slate-800 border-2 border-black h-12 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <SelectValue placeholder="Select usage category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-800 border-2 border-black font-black">
                            {METER_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showIndustryType && (
                    <FormField
                      control={form.control}
                      name="industryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Industry Scale</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="neo-input bg-white dark:bg-slate-800 border-2 border-black h-12 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <SelectValue placeholder="Select industry scale" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-slate-800 border-2 border-black font-black">
                              {INDUSTRY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="neo-button w-full bg-black text-white hover:bg-aurora-green h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] font-black uppercase"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'AUTHORIZE DEPLOYMENT'
                    )}
                  </Button>
                </form>
              </Form>      
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile: Add New Button */}
      {isMobile && activeTab === 'history' && (
        <Button
          onClick={() => setActiveTab('new')}
          className="neo-button w-full bg-[#facc15] text-black hover:bg-black hover:text-white h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase"
        >
          <Plus className="h-5 w-5 mr-2" />
          PROVISION NEW TERMINAL
        </Button>
      )}

      {/* Help Section */}
      <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#3b82f6]/10">
        <CardHeader className="pb-3 border-b-2 border-dashed border-black">
          <CardTitle className="text-xl font-black uppercase text-black dark:text-white tracking-widest">
            OPERATIONAL ASSISTANCE
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">
              {providerConfig.type === 'solar'
                ? 'LOCATING INVERTER ID:'
                : 'LOCATING METER SERIAL:'}
            </h4>
            <ul className="text-sm font-bold text-black/70 dark:text-white/70 space-y-2">
              {providerConfig.type === 'solar' ? (
                <>
                  <li className="flex gap-2"><span>[•]</span> Check inverter physical plate or system settings.</li>
                  <li className="flex gap-2"><span>[•]</span> Lookup device UUID in your cloud management dashboard.</li>
                </>
              ) : (
                <>
                  <li className="flex gap-2"><span>[•]</span> Inspect your latest KPLC digital bill.</li>
                  <li className="flex gap-2"><span>[•]</span> Read 11-digit serial on the physical meter display.</li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">METER CATEGORIES:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-black p-3 border-2 border-black">
                <span className="font-black text-xs uppercase block mb-1 text-aurora-purple">Household</span>
                <p className="text-[10px] font-bold opacity-70 uppercase">Residential units and domestic service endpoints.</p>
              </div>
              <div className="bg-white dark:bg-black p-3 border-2 border-black">
                <span className="font-black text-xs uppercase block mb-1 text-aurora-blue">SME / Industry</span>
                <p className="text-[10px] font-bold opacity-70 uppercase">Commercial enterprises and manufacturing architecture.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeterSetup;
