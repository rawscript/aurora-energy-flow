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
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gauge, User, Phone, MapPin, History, Plus, Check, Clock, Building, Factory, Zap, AlertTriangle, Sun } from 'lucide-react';
import BatteryFull from '@/components/ui/BatteryFull';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const MeterSetup = ({}: MeterSetupProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [meterHistory, setMeterHistory] = useState<MeterHistory[]>([]);
  const [activeTab, setActiveTab] = useState('current');
  const [showIndustryType, setShowIndustryType] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchingRef = useRef(false);
  
  const { user, session } = useAuth();
  const { profile, loading: profileLoading, setupMeter } = useProfile();
  const { provider, providerConfig, setProvider } = useEnergyProvider();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { connectToMeter, hasMeterConnected, meterNumber, loading: energyLoading } = useRealTimeEnergy();

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema(provider || 'KPLC')),
    defaultValues: {
      meterNumber: '',
      fullName: '',
      phoneNumber: '',
      location: '',
      meterCategory: 'household',
      industryType: undefined,
      energyProvider: provider || 'KPLC',
    },
  });
  
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
        energyProvider: profile.energy_provider || provider || 'KPLC',
      });

      // Set industry type visibility
      setShowIndustryType(profile.meter_category === 'industry');
      setIsInitialized(true);
    }
  }, [profile, user, form, isInitialized, provider]);

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
      
      // Wait a bit for the profile to update before connecting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Connect to the SPECIFIC meter using the real-time energy hook
      const success = await connectToMeter(historyItem.meter_number);
      
      if (success) {
        toast({
          title: "Meter Connected",
          description: `Successfully connected to meter ${historyItem.meter_number}. Real-time data collection is now enabled.`,
        });
        
        // Refresh the meter history to reflect the current selection
        await fetchMeterHistory();
      } else {
        toast({
          title: "Connection Issue",
          description: `Meter ${historyItem.meter_number} was set up but real-time connection failed. Will retry automatically.`,
          variant: "destructive",
        });
      }

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
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      // Use the profile hook to setup meter
      const success = await setupMeter({
        meter_number: data.meterNumber,
        meter_category: data.meterCategory,
        industry_type: data.meterCategory === 'industry' ? data.industryType : undefined,
        energy_provider: data.energyProvider,
      });

      if (!success) {
        throw new Error('Failed to setup meter');
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

      // Wait a bit for the profile to update before connecting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Connect to the meter using the real-time energy hook
      const meterSuccess = await connectToMeter(data.meterNumber);

      if (meterSuccess) {
        toast({
          title: `${data.energyProvider} ${data.energyProvider === 'KPLC' ? 'Meter' : 'Inverter'} Connected`,
          description: `Your ${data.energyProvider === 'KPLC' ? 'smart meter' : 'inverter'} has been successfully connected to Aurora Energy. Real-time data collection is now enabled.`,
        });

        // Refresh the meter history to show the new meter
        await fetchMeterHistory();
        setActiveTab('current');
      } else {
        toast({
          title: "Partial Setup",
          description: `${data.energyProvider === 'KPLC' ? 'Meter' : 'Inverter'} details saved but real-time connection failed. Will retry automatically.`,
          variant: "destructive",
        });
      }
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
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl text-aurora-green-light flex items-center gap-2">
            {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
              <>
                <SolarPanel className="h-5 w-5 sm:h-6 sm:w-6" />
                Solar Inverter Setup
              </>
            ) : (
              <>
                <Gauge className="h-5 w-5 sm:h-6 sm:w-6" />
                Smart Meter Setup
              </>
            )}
          </CardTitle>
          <p className="text-sm text-gray-400">
            {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
              ? 'Connect your solar inverter to start monitoring your solar energy generation.'
              : 'Connect your Kenya Power smart meter to start monitoring your real energy usage.'}
          </p>
          <div className="mt-2 p-2 bg-aurora-green/10 border border-aurora-green/20 rounded-md">
            <p className="text-xs text-aurora-green-light flex items-center">
              <Check className="h-4 w-4 mr-1 flex-shrink-0" />
              {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                ? 'Setting up your inverter enables real-time solar generation data collection and personalized insights'
                : 'Setting up your meter enables real-time data collection and personalized insights'}
            </p>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} bg-aurora-card border border-aurora-green/20`}>
          <TabsTrigger value="current" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs sm:text-sm">
            <Gauge className="h-4 w-4 mr-1" />
            {isMobile ? 'Current' : 'Current Meter'}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs sm:text-sm">
            <History className="h-4 w-4 mr-1" />
            {isMobile ? 'History' : 'Meter History'}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="new" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add New
            </TabsTrigger>
          )}
        </TabsList>

        {/* Current Meter Tab */}
        <TabsContent value="current" className="space-y-4">
          {/* Show existing profile data if available */}
          {profile && (profile.full_name || profile.phone_number) && !profile.meter_number && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Check className="h-5 w-5" />
                  Your Saved Information
                </CardTitle>
                <p className="text-sm text-green-700">
                  {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                    ? 'We found some information from your signup. You can edit it during meter/ inverter setup process.'
                    : 'We found some information from your signup. You can edit it during meter/ inverter setup process.'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.full_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Name:</span> {profile.full_name}
                  </div>
                )}
                {profile.phone_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Phone:</span> {profile.phone_number}
                  </div>
                )}
                {profile.meter_category && (
                  <div className="flex items-center gap-2 text-sm">
                    {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                      <SolarPanel className="h-4 w-4 text-green-600" />
                    ) : (
                      <Building className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium">Category:</span> {profile.meter_category}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {profile?.meter_number ? (
            <Card className="bg-aurora-card border-aurora-green/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-aurora-green-light">
                      {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Connected Inverter' : 'Connected Meter'}
                    </CardTitle>
                    <div className="flex mt-1 space-x-2">
                      {profile?.meter_category && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                            <SolarPanel className="h-3 w-3 mr-1" />
                          ) : (
                            <Building className="h-3 w-3 mr-1" />
                          )}
                          {profile.meter_category === 'SME' ? 'SME' : 
                           profile.meter_category.charAt(0).toUpperCase() + profile.meter_category.slice(1)}
                        </Badge>
                      )}
                      {profile?.meter_category === 'industry' && profile?.industry_type && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <Factory className="h-3 w-3 mr-1" />
                          {profile.industry_type.charAt(0).toUpperCase() + profile.industry_type.slice(1)}
                        </Badge>
                      )}
                      <Badge className={`${hasMeterConnected ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                        <Zap className="h-3 w-3 mr-1" />
                        {hasMeterConnected ? 'Real-time' : 'Connecting...'}
                      </Badge>
                    </div>
                  </div>
                  <div className={`flex items-center text-sm ${hasMeterConnected ? 'text-aurora-green' : 'text-yellow-400'}`}>
                    {hasMeterConnected ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Connecting
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Inverter ID' : 'Meter Number'}
                    </Label>
                    <p className="font-mono text-lg text-aurora-green-light">
                      {profile.meter_number}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Account Holder</Label>
                    <p className="text-lg">{profile.full_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Phone Number</Label>
                    <p className="text-lg">{profile.phone_number || 'Not set'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${hasMeterConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                      <span className={hasMeterConnected ? 'text-green-400' : 'text-yellow-400'}>
                        {hasMeterConnected ? 'Connected' : 'Connecting...'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Inverter Category' : 'Meter Category'}
                    </Label>
                    <div className="flex items-center space-x-2">
                      {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                        <SolarPanel className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Building className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="text-lg">
                        {profile.meter_category ?
                          METER_CATEGORIES.find(c => c.value === profile.meter_category)?.label ||
                          profile.meter_category :
                          'Household'}
                      </span>
                    </div>
                  </div>
                  {profile.meter_category === 'industry' && profile.industry_type && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Industry Type</Label>
                      <div className="flex items-center space-x-2">
                        <Factory className="h-4 w-4 text-orange-400" />
                        <span className="text-lg">
                          {INDUSTRY_TYPES.find(t => t.value === profile.industry_type)?.label ||
                           profile.industry_type}
                        </span>
                      </div>
                    </div>
                  )}
                  {provider !== 'KPLC' && profile.battery_count && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Battery Count</Label>
                      <div className="flex items-center space-x-2">
                        <BatteryFull className="h-4 w-4 text-amber-400" />
                        <span className="text-lg">
                          {profile.battery_count}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                  variant="outline"
                  className="w-full border-aurora-blue/30 hover:bg-aurora-blue/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isMobile ? 'Change' : 'Setup Different'} {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Inverter' : 'Meter'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-aurora-card border-yellow-500/20">
              <CardContent className="p-6 text-center">
                {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                  <SolarPanel className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                ) : (
                  <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                )}
                <h3 className="text-lg font-medium mb-2">
                  No {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Inverter' : 'Meter'} Connected
                </h3>
                <p className="text-muted-foreground mb-4">
                  {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                    ? 'Connect your solar inverter to start monitoring your energy generation based on your category'
                    : 'Connect your smart meter to start monitoring your energy usage based on your category'}
                </p>
                <Button
                  onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                  className="bg-aurora-green hover:bg-aurora-green/80"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Setup {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Inverter' : 'Meter'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Meter History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-aurora-card border-aurora-blue/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-aurora-blue-light">Previous Meters</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select from previously used meters or add a new one
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-blue mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading meter history...</p>
                </div>
              ) : meterHistory.length > 0 ? (
                <>
                  {meterHistory.map((meter) => (
                    <div
                      key={meter.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        meter.is_current 
                          ? 'bg-aurora-green/10 border-aurora-green/30 hover:border-aurora-green/50' 
                          : 'bg-slate-800/30 border-slate-700/50 hover:border-aurora-blue/30'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Gauge className={`h-5 w-5 ${meter.is_current ? 'text-aurora-green' : 'text-aurora-blue-light'}`} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-mono text-sm font-medium">
                                {meter.meter_number}
                              </p>
                              {meter.is_current && (
                                <Badge className="bg-aurora-green/20 text-aurora-green border-aurora-green/30 text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {meter.full_name} • {meter.phone_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {meter.location && `${meter.location} • `}
                              Used: {new Date(meter.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center mt-1">
                              {meter.meter_category && (
                                <Badge className="mr-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                  {meter.meter_category === 'SME' ? 'SME' : 
                                   meter.meter_category.charAt(0).toUpperCase() + meter.meter_category.slice(1)}
                                </Badge>
                              )}
                              {meter.meter_category === 'industry' && meter.industry_type && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                  {meter.industry_type.charAt(0).toUpperCase() + meter.industry_type.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!meter.is_current && (
                        <Button
                          onClick={() => selectFromHistory(meter)}
                          disabled={isLoading}
                          size="sm"
                          className="bg-aurora-green hover:bg-aurora-green/80"
                        >
                          {isLoading ? 'Connecting...' : 'Select'}
                        </Button>
                      )}
                      {meter.is_current && (
                        <div className="flex items-center text-aurora-green text-sm">
                          <Check className="h-4 w-4 mr-1" />
                          Active
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-700/50">
                    <Button
                      onClick={() => setActiveTab('new')}
                      variant="outline"
                      className="w-full border-aurora-green/30 hover:bg-aurora-green/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Meter
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No previous meters found</p>
                  <Button
                    onClick={() => setActiveTab('new')}
                    className="bg-aurora-green hover:bg-aurora-green/80"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Setup First Meter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Meter Tab */}
        <TabsContent value="new" className="space-y-4">
          <Card className="bg-aurora-card border-aurora-purple/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-aurora-purple-light">
                {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'Add New Inverter' : 'Add New Meter'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                  ? 'Enter your inverter details to connect a new solar inverter'
                  : 'Enter your meter details to connect a new smart meter'}
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  <FormField
                    control={form.control}
                    name="energyProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-aurora-purple-light">Energy Provider</FormLabel>
                        <FormControl>
                          <div className="relative">
                            {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                              <Sun className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            ) : (
                              <Zap className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            )}
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setProvider(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="pl-10 bg-slate-800 border-aurora-purple/30 h-11">
                                  <SelectValue placeholder="Select energy provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-aurora-purple/30">
                                {ENERGY_PROVIDERS.map((provider) => (
                                  <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Select your energy provider
                        </FormDescription>
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
                          <FormLabel className="text-aurora-green-light">{selectedProviderObj.meterLabel}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                                <SolarPanel className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              ) : (
                                <Gauge className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              )}
                              <Input
                                placeholder={selectedProviderObj.placeholder}
                                className="pl-10 bg-slate-800 border-aurora-green/30 h-11"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            {selectedProviderObj.placeholder.includes("KPLC")
                              ? "Find this 11-digit number on your electricity bill or meter display"
                              : provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                                ? "Find this ID on your inverter display or documentation"
                                : "Find this number on your bill or device"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-aurora-blue-light">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Your full name as on the bill"
                              className="pl-10 bg-slate-800 border-aurora-blue/30 h-11"
                              {...field} 
                            />
                          </div>
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
                        <FormLabel className="text-aurora-purple-light">Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="0700 000 000"
                              className="pl-10 bg-slate-800 border-aurora-purple/30 h-11"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Used for billing notifications and alerts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-emerald-400">Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Nairobi, Westlands"
                              className="pl-10 bg-slate-800 border-emerald-500/30 h-11"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Help us provide location-specific energy tips
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Meter Category Dropdown */}
                  <FormField
                    control={form.control}
                    name="meterCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-400">Meter Category</FormLabel>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => handleMeterCategoryChange(value)}
                          >
                            <FormControl>
                              <SelectTrigger className="pl-10 bg-slate-800 border-amber-500/30 h-11">
                                <SelectValue placeholder="Select meter category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border-amber-500/30">
                              {METER_CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormDescription className="text-xs">
                          Select the category that best describes your meter usage
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Industry Type Dropdown - Only shown when meter category is 'industry' */}
                  {showIndustryType && (
                    <FormField
                      control={form.control}
                      name="industryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-400">Industry Type</FormLabel>
                          <div className="relative">
                            <Factory className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="pl-10 bg-slate-800 border-orange-500/30 h-11">
                                  <SelectValue placeholder="Select industry type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-orange-500/30">
                                {INDUSTRY_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormDescription className="text-xs">
                            Specify your industry's energy consumption level
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-aurora-green to-aurora-blue hover:from-aurora-green/80 hover:to-aurora-blue/80 h-11"
                  >
                    {isLoading ? (
                      'Connecting...'
                    ) : provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                      'Connect Solar Inverter'
                    ) : (
                      'Connect Smart Meter'
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
          className="w-full bg-aurora-green hover:bg-aurora-green/80 h-12"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Meter
        </Button>
      )}

      {/* Help Section */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-aurora-blue-light">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar'
                ? 'Finding Your Inverter ID:'
                : 'Finding Your Meter Number:'}
            </h4>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? (
                <>
                  <li>• Check your inverter documentation or display panel</li>
                  <li>• Look for a serial number or device ID on your inverter</li>
                  <li>• Contact your solar provider for assistance</li>
                </>
              ) : (
                <>
                  <li>• Check your latest Kenya Power bill</li>
                  <li>• Look on the digital display of your smart meter</li>
                  <li>• Call Kenya Power at 95551 for assistance</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Meter Categories:</h4>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              <li>• <span className="text-amber-400">Household:</span> For residential homes and apartments</li>
              <li>• <span className="text-amber-400">SME:</span> For small and medium businesses</li>
              <li>• <span className="text-amber-400">Industry:</span> For manufacturing and large operations</li>
              <li className="pl-4">- <span className="text-orange-400">Heavy Duty:</span> High energy consumption facilities</li>
              <li className="pl-4">- <span className="text-orange-400">Medium Duty:</span> Standard industrial usage</li>
              <li className="pl-4">- <span className="text-orange-400">Light Duty:</span> Lower energy industrial operations</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Troubleshooting:</h4>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              <li>• Ensure your {provider === 'Solar' || provider === 'SunCulture' || provider === 'M-KOPA Solar' ? 'inverter ID' : 'meter number'} is correct</li>
              <li>• Contact support if connection fails</li>
              <li>• Check your internet connection</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeterSetup;