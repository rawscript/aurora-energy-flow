import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Gauge, User, Phone, MapPin, History, Plus, Check, Clock, Building, Factory, Zap, AlertTriangle, Sun, Loader2, Info } from 'lucide-react';
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in py-4">
      {/* Hero Header Card */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-aurora-green/20 via-slate-900/40 to-slate-950/60">
        <CardHeader className="pb-8 px-8 pt-8 relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            {providerConfig.type === 'solar' ? (
              <Sun className="h-32 w-32 text-aurora-green-light" />
            ) : (
              <Zap className="h-32 w-32 text-aurora-green-light" />
            )}
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl group transition-all hover:scale-105">
              {providerConfig.type === 'solar' ? (
                <SolarPanel className="h-8 w-8 sm:h-10 sm:w-10 text-aurora-green-light" />
              ) : (
                <Gauge className="h-8 w-8 sm:h-10 sm:w-10 text-aurora-green-light" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
                {providerConfig.terminology.setup}
              </CardTitle>
              <p className="text-sm font-medium text-slate-400 mt-1 max-w-lg leading-relaxed">
                {providerConfig.type === 'solar'
                  ? `Initialize your solar harvesting array. Synchronize your ${providerConfig.terminology.device} to unlock real-time predictive telemetry.`
                  : `Establish a secure uplink with your Kenya Power smart meter. Broadcast live consumption vectors into the neural engine.`}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-14 bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md">
          <TabsTrigger 
            value="current" 
            className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            <Gauge className="h-4 w-4 mr-2" />
            {isMobile ? 'DEVICE' : 'ACTIVE TERMINAL'}
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            <History className="h-4 w-4 mr-2" />
            {isMobile ? 'LOGS' : 'HANDOFF HISTORY'}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger 
              value="new" 
              className="rounded-xl font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              PROVISION NEW
            </TabsTrigger>
          )}
        </TabsList>

        {/* Current Meter Tab */}
        <TabsContent value="current" className="space-y-6 outline-none">
          {profile?.meter_number ? (
            <Card className="overflow-hidden border-white/10">
              <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-aurora-green/10 border border-aurora-green/20">
                      {providerConfig.type === 'solar' ? <SolarPanel className="h-5 w-5 text-aurora-green-light" /> : <Gauge className="h-5 w-5 text-aurora-green-light" />}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white tracking-tight uppercase">
                        {providerConfig.type === 'solar' ? 'CONNECTED ARRAY' : 'ACTIVE SMART METER'}
                      </CardTitle>
                      <div className="flex flex-wrap mt-2 gap-3">
                        <Badge variant="outline" className="bg-aurora-purple/10 text-aurora-purple-light border-aurora-purple/20 font-bold text-[10px] uppercase tracking-widest px-2.5 py-0.5">
                          {profile.meter_category || 'HOUSEHOLD'}
                        </Badge>
                        <Badge variant="outline" className={`font-bold text-[10px] uppercase tracking-widest px-2.5 py-0.5 ${hasMeterConnected ? 'bg-aurora-green/10 text-aurora-green-light border-aurora-green/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse'}`}>
                          {hasMeterConnected ? 'UPSTREAM ATTACHED' : 'INITIALIZING SYNC...'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      {providerConfig.type === 'solar' ? 'ARRAY IDENTIFIER' : 'METER SERIAL'}
                    </Label>
                    <p className="font-bold text-2xl text-white font-mono tracking-wider">
                      {profile.meter_number}
                    </p>
                  </div>
                  <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">ACCOUNT HOLDER</Label>
                    <p className="font-bold text-2xl text-white">{profile.full_name}</p>
                  </div>
                  <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">CONTACT REFERENCE</Label>
                    <p className="font-bold text-xl text-slate-300">{profile.phone_number || 'NOT SPECIFIED'}</p>
                  </div>
                  <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">OPERATIONAL STATUS</Label>
                    <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${hasMeterConnected ? 'bg-aurora-green animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                       <span className={`font-bold text-sm uppercase tracking-widest ${hasMeterConnected ? 'text-aurora-green-light' : 'text-red-400'}`}>
                        {hasMeterConnected ? 'STABLE DOWNLINK' : 'LINK SEVERED'}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {hasMeterConnected ? (
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      className="h-14 border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold tracking-widest flex-1 uppercase"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <AlertTriangle className="h-5 w-5 mr-3" />}
                      TERMINATE UPLINK
                    </Button>
                  ) : (
                    <Button
                      onClick={handleReconnect}
                      className="h-14 bg-aurora-green hover:bg-aurora-green/90 text-[#0f172a] font-bold tracking-widest flex-1 uppercase shadow-lg shadow-aurora-green/20"
                      disabled={isLoading || !lastDisconnectedMeter}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-3" />}
                      RE-ESTABLISH LINK
                    </Button>
                  )}
                  <Button
                    onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                    variant="outline"
                    className="h-14 border-white/10 text-slate-300 hover:bg-white/5 font-bold tracking-widest flex-1 uppercase"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    DECOMMISSION & SWITCH
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-none bg-gradient-to-br from-yellow-500/10 via-slate-900/40 to-slate-950/60 py-12">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 mx-auto relative group">
                  <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl transition-all group-hover:blur-3xl"></div>
                  {providerConfig.type === 'solar' ? (
                    <SolarPanel className="h-12 w-12 text-yellow-500 relative z-10" />
                  ) : (
                    <Zap className="h-12 w-12 text-yellow-500 relative z-10" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">
                  Neural Bridge Inactive
                </h3>
                <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
                  Your terminal is currently operating in isolation. Initialize a hardware link to broadcast real-time telemetry into the core.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                    className="h-12 px-10 bg-white text-[#0f172a] hover:bg-slate-200 font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    INITIALIZE SETUP
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Meter History Tab */}
        <TabsContent value="history" className="space-y-6 outline-none">
          <Card className="overflow-hidden border-white/10">
            <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
              <CardTitle className="text-xl font-bold text-white tracking-tight uppercase">
                {providerConfig.terminology.setup.replace('Setup', 'DECOMMISSION LOGS')}
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Archive of previously synchronized hardware endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {historyLoading ? (
                <div className="text-center py-24">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-6 text-aurora-green-light" />
                  <p className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Retrieving encrypted archives...</p>
                </div>
              ) : meterHistory.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {meterHistory.map((meter) => (
                    <div
                      key={meter.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border transition-all duration-300 group ${meter.is_current
                        ? 'bg-aurora-green/5 border-aurora-green/20'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                        }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-5">
                          <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${meter.is_current ? 'bg-aurora-green/20 text-aurora-green-light' : 'bg-white/5 text-slate-400'}`}>
                            {providerConfig.type === 'solar' ? <SolarPanel className="h-6 w-6" /> : <Gauge className="h-6 w-6" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                              <p className="font-bold text-lg text-white font-mono tracking-wider">
                                {meter.meter_number}
                              </p>
                              {meter.is_current && (
                                <Badge variant="outline" className="bg-aurora-green/10 text-aurora-green-light border-aurora-green/20 font-bold text-[9px] uppercase tracking-widest px-2 py-0 h-5">
                                  ACTIVE NODE
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                {meter.full_name} • {meter.phone_number}
                              </p>
                              <Badge variant="outline" className="bg-white/5 text-[9px] font-bold uppercase border-none h-4 px-1.5 text-slate-400">
                                {meter.location || 'GLOBAL REACH'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 border-t sm:border-none border-white/5 pt-4 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase text-slate-600 block tracking-widest mb-1">PROVISION DATE</p>
                          <p className="font-bold text-xs text-slate-400">
                            {(() => {
                              try {
                                if (!meter.created_at) return 'N/A';
                                const date = new Date(meter.created_at);
                                return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                              } catch (e) { return 'N/A'; }
                            })()}
                          </p>
                        </div>
                        {!meter.is_current && (
                          <Button
                            onClick={() => selectFromHistory(meter)}
                            disabled={isLoading}
                            variant="outline"
                            className="border-white/10 text-slate-300 hover:bg-white/5 font-bold text-[10px] uppercase tracking-widest px-6 h-10"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'RE-ATTACH'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-6">
                    <Button
                      onClick={() => setActiveTab('new')}
                      variant="outline"
                      className="w-full h-14 border-dashed border-white/20 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/40 font-bold uppercase tracking-widest rounded-2xl"
                    >
                      <Plus className="h-5 w-5 mr-3" />
                      PROVISION NEW HARDWARE
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 px-6 rounded-3xl bg-white/[0.02] border border-dashed border-white/10">
                  <History className="h-12 w-12 mx-auto mb-6 text-slate-600" />
                  <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-widest">Archive Empty</h3>
                  <p className="text-sm font-medium text-slate-500 mb-10 max-w-xs mx-auto leading-relaxed">No historical telemetry deployments detected in the neural records.</p>
                  <Button
                    onClick={() => setActiveTab('new')}
                    className="h-12 px-10 bg-white text-[#0f172a] hover:bg-slate-200 font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    CREATE FIRST ENTRY
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Meter Tab */}
        <TabsContent value="new" className="space-y-6 outline-none">
          <Card className="overflow-hidden border-white/10">
            <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
              <CardTitle className="text-xl font-bold text-white tracking-tight uppercase">
                {providerConfig.terminology.setup.replace('Setup', 'HARDWARE PROVISIONING')}
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Link a new hardware endpoint to your neural profile.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                      control={form.control}
                      name="energyProvider"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <Building className="h-3.5 w-3.5 mr-2" />
                            NETWORK ARCHITECTURE
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setProvider(value);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all">
                                <SelectValue placeholder="Select network provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900/95 border-white/10 backdrop-blur-xl text-white">
                              {ENERGY_PROVIDERS.map((provider) => (
                                <SelectItem key={provider.value} value={provider.value} className="focus:bg-white/10 font-medium">
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meterNumber"
                      render={({ field }) => {
                        const selectedProviderObj = ENERGY_PROVIDERS.find(p => p.value === form.watch('energyProvider')) || ENERGY_PROVIDERS[0];
                        return (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                              <Gauge className="h-3.5 w-3.5 mr-2" />
                              {selectedProviderObj.meterLabel.toUpperCase()}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={selectedProviderObj.placeholder}
                                className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all placeholder:text-slate-600"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="font-bold text-xs" />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <User className="h-3.5 w-3.5 mr-2" />
                            OPERATOR NAME
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="FULL LEGAL NAME"
                              className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all placeholder:text-slate-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-2" />
                            SYNC CONTACT
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+254 700 000 000"
                              className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all placeholder:text-slate-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-2" />
                            GEOGRAPHIC CONTEXT
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ESTATE, CITY"
                              className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all placeholder:text-slate-600"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meterCategory"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <Building className="h-3.5 w-3.5 mr-2" />
                            NODE CATEGORY
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={handleMeterCategoryChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all">
                                <SelectValue placeholder="Select node category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900/95 border-white/10 backdrop-blur-xl text-white">
                              {METER_CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value} className="focus:bg-white/10 font-medium">
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {showIndustryType && (
                    <FormField
                      control={form.control}
                      name="industryType"
                      render={({ field }) => (
                        <FormItem className="space-y-3 animate-slide-in-right">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                            <Factory className="h-3.5 w-3.5 mr-2" />
                            OPERATIONAL INTENSITY
                          </FormLabel>
                          <Select
                            value={field.value || 'medium'}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white focus:ring-aurora-green/20 focus:border-aurora-green/40 transition-all">
                                <SelectValue placeholder="Select intensity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-900/95 border-white/10 backdrop-blur-xl text-white">
                              {INDUSTRY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="focus:bg-white/10 font-medium">
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="font-bold text-xs" />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="pt-6">
                    <Button
                      type="submit"
                      className="w-full h-16 bg-aurora-green hover:bg-aurora-green/90 text-[#0f172a] font-black text-lg uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-aurora-green/20"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin mr-3" />
                          ESTABLISHING UPLINK...
                        </>
                      ) : (
                        <>
                          <Zap className="h-6 w-6 mr-3" />
                          INITIALIZE DOWNLINK
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Help Section */}
      <Card className="overflow-hidden border-white/10 bg-aurora-blue/5">
        <CardHeader className="pb-4 border-b border-white/5">
          <CardTitle className="text-xl font-bold uppercase text-white tracking-widest flex items-center gap-3">
            <Info className="h-5 w-5 text-aurora-blue-light" />
            OPERATIONAL ASSISTANCE
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          <div className="space-y-4">
            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {providerConfig.type === 'solar'
                ? 'LOCATING ARRAY IDENTIFIER:'
                : 'LOCATING METER SERIAL:'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-aurora-blue-light mt-1.5 shrink-0"></div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  {providerConfig.type === 'solar' 
                    ? 'Inspect the physical manufacturer plate on your inverter chassis.' 
                    : 'Reference your latest digital KPLC utility statement.'}
                </p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-aurora-blue-light mt-1.5 shrink-0"></div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  {providerConfig.type === 'solar'
                    ? 'Retrieve the UUID directly from your cloud monitoring dashboard.'
                    : 'Examine the 11-digit serial displayed on the physical meter hardware.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">NODE ARCHITECTURE:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                <span className="font-bold text-xs uppercase block mb-2 text-aurora-purple-light">Household Node</span>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed">Standard residential deployments and domestic consumption endpoints.</p>
              </div>
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                <span className="font-bold text-xs uppercase block mb-2 text-aurora-blue-light">SME / Industrial Node</span>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed">Commercial infrastructure, manufacturing arrays, and high-intensity vectors.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeterSetup;

