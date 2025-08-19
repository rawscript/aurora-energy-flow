import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gauge, User, Phone, MapPin, History, Plus, Check, Clock, Building, Factory, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealTimeEnergy } from '@/hooks/useRealTimeEnergy';

const meterFormSchema = z.object({
  meterNumber: z.string().min(5, 'Meter number must be at least 5 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  meterCategory: z.enum(['household', 'SME', 'industry']),
  industryType: z.enum(['heavyduty', 'medium', 'light']).optional(),
});

type MeterFormValues = z.infer<typeof meterFormSchema>;

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

interface MeterHistory {
  id: string;
  meter_number: string;
  full_name: string;
  phone_number: string;
  created_at: string;
  is_current: boolean;
  meter_category?: string;
  industry_type?: string;
}

const MeterSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [meterHistory, setMeterHistory] = useState<MeterHistory[]>([]);
  const [activeTab, setActiveTab] = useState('current');
  const [showIndustryType, setShowIndustryType] = useState(false);
  const { user } = useAuth();
  const { profile, loading: profileLoading, setupMeter } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { connectToMeter, useMockData, meterNumber } = useRealTimeEnergy();

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema),
    defaultValues: {
      meterNumber: profile?.meter_number || '',
      fullName: profile?.full_name || user?.user_metadata?.full_name || '',
      phoneNumber: profile?.phone_number || user?.user_metadata?.phone_number || '',
      location: '',
      meterCategory: (profile?.meter_category as 'household' | 'SME' | 'industry') || 'household',
      industryType: (profile?.industry_type as 'heavyduty' | 'medium' | 'light') || undefined,
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

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        meterNumber: profile.meter_number || '',
        fullName: profile.full_name || user?.user_metadata?.full_name || '',
        phoneNumber: profile.phone_number || user?.user_metadata?.phone_number || '',
        location: '',
        meterCategory: (profile.meter_category as 'household' | 'SME' | 'industry') || 'household',
        industryType: (profile.industry_type as 'heavyduty' | 'medium' | 'light') || undefined,
      });
      
      // Set industry type visibility
      setShowIndustryType(profile.meter_category === 'industry');
    }
  }, [profile, user, form]);

  // Fetch meter history
  useEffect(() => {
    if (user) {
      fetchMeterHistory();
    }
  }, [user]);

  const fetchMeterHistory = async () => {
    try {
      // Since we don't have a meter_history table, we'll simulate it
      // In a real app, you'd have a separate table for meter history
      const mockHistory: MeterHistory[] = [
        {
          id: '1',
          meter_number: '12345678901',
          full_name: 'John Doe',
          phone_number: '+254700000001',
          created_at: '2024-01-15T10:00:00Z',
          is_current: false,
          meter_category: 'household'
        },
        {
          id: '2',
          meter_number: '98765432109',
          full_name: 'John Doe',
          phone_number: '+254700000002',
          created_at: '2024-06-20T14:30:00Z',
          is_current: false,
          meter_category: 'SME'
        },
        {
          id: '3',
          meter_number: '56789012345',
          full_name: 'John Doe',
          phone_number: '+254700000003',
          created_at: '2024-07-10T09:15:00Z',
          is_current: false,
          meter_category: 'industry',
          industry_type: 'heavyduty'
        }
      ];
      //add meter history logic to supabase to ensure that users can get readings from history
      setMeterHistory(mockHistory);
    } catch (error) {
      console.error('Error fetching meter history:', error);
    }
  };

  const selectFromHistory = async (historyItem: MeterHistory) => {
    setIsLoading(true);
    try {
      // Ensure user ID is available
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Prepare the profile data with proper typing
      const profileData = {
        id: user.id,
        email: user.email || '',
        full_name: historyItem.full_name,
        phone_number: historyItem.phone_number,
        meter_number: historyItem.meter_number,
      };
      
      // Create the complete profile data object with proper typing
      const completeProfileData = {
        ...profileData,
        meter_category: '',
        industry_type: null as string | null,
      };

      // Use the meter category from history if available, otherwise use current or default
      if (historyItem.meter_category) {
        completeProfileData.meter_category = historyItem.meter_category;
        
        // If it's an industry meter, include the industry type
        if (historyItem.meter_category === 'industry' && historyItem.industry_type) {
          completeProfileData.industry_type = historyItem.industry_type;
        } else if (historyItem.meter_category === 'industry') {
          // Default industry type if not specified
          completeProfileData.industry_type = 'medium';
        } else {
          // Clear industry type for non-industry meters
          completeProfileData.industry_type = null;
        }
      } else {
        // If no category in history, get from current profile or use default
        const { data: currentData } = await supabase
          .from('profiles')
          .select('meter_category, industry_type')
          .eq('id', user.id)
          .single();
          
        completeProfileData.meter_category = currentData?.meter_category || 'household';
        completeProfileData.industry_type = 
          (completeProfileData.meter_category === 'industry') ? 
          (currentData?.industry_type || 'medium') : null;
      }
        
      const { error } = await supabase
        .from('profiles')
        .upsert(completeProfileData);

      if (error) throw error;
      
      // Connect to the meter using the real-time energy hook
      const success = await connectToMeter(historyItem.meter_number);
      
      if (success) {
        toast({
          title: "Meter Connected",
          description: `Successfully connected to meter ${historyItem.meter_number}. Real-time data collection is now enabled.`,
        });
      } else {
        toast({
          title: "Partial Connection",
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

  const onSubmit = async (data: MeterFormValues) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Use the profile hook to setup meter
      const success = await setupMeter({
        meter_number: data.meterNumber,
        meter_category: data.meterCategory,
        industry_type: data.meterCategory === 'industry' ? data.industryType : undefined,
      });

      if (!success) {
        throw new Error('Failed to setup meter');
      }

      // Also update other profile fields
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Connect to the meter using the real-time energy hook
      const meterSuccess = await connectToMeter(data.meterNumber);
      
      if (meterSuccess) {
        toast({
          title: "Meter Connected",
          description: "Your smart meter has been successfully connected to Aurora Energy. Real-time data collection is now enabled.",
        });
      } else {
        toast({
          title: "Partial Setup",
          description: "Meter details saved but real-time connection failed. Will retry automatically.",
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
            <Gauge className="h-5 w-5 sm:h-6 sm:w-6" />
            Smart Meter Setup
          </CardTitle>
          <p className="text-sm text-gray-400">
            Connect your Kenya Power smart meter to start monitoring your real energy usage.
          </p>
          <div className="mt-2 p-2 bg-aurora-green/10 border border-aurora-green/20 rounded-md">
            <p className="text-xs text-aurora-green-light flex items-center">
              <Check className="h-4 w-4 mr-1 flex-shrink-0" />
              Setting up your meter enables real-time data collection and personalized insights
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
                  We found some information from your signup. You can edit or add to it below.
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
                    <Building className="h-4 w-4 text-green-600" />
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
                    <CardTitle className="text-lg text-aurora-green-light">Connected Meter</CardTitle>
                    <div className="flex mt-1 space-x-2">
                      {profile?.meter_category && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Building className="h-3 w-3 mr-1" />
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
                      {useMockData ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Simulated
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Zap className="h-3 w-3 mr-1" />
                          Real-time
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={useMockData 
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-green-500/20 text-green-400 border-green-500/30"
                  }>
                    {useMockData ? (
                      <>
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Simulated
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Meter Number</Label>
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
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400">Connected</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Meter Category</Label>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-amber-400" />
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
                </div>
                <Button
                  onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                  variant="outline"
                  className="w-full border-aurora-blue/30 hover:bg-aurora-blue/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isMobile ? 'Change Meter' : 'Setup Different Meter'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-aurora-card border-yellow-500/20">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-2">No Meter Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your smart meter to start monitoring your energy usage based on your category
                </p>
                <Button
                  onClick={() => setActiveTab(isMobile ? 'history' : 'new')}
                  className="bg-aurora-green hover:bg-aurora-green/80"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Setup Meter
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
              {meterHistory.length > 0 ? (
                <>
                  {meterHistory.map((meter) => (
                    <div
                      key={meter.id}
                      className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-aurora-blue/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Gauge className="h-5 w-5 text-aurora-blue-light" />
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {meter.meter_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {meter.full_name} • {meter.phone_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
                      <Button
                        onClick={() => selectFromHistory(meter)}
                        disabled={isLoading}
                        size="sm"
                        className="bg-aurora-green hover:bg-aurora-green/80"
                      >
                        {isLoading ? 'Connecting...' : 'Select'}
                      </Button>
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
              <CardTitle className="text-lg text-aurora-purple-light">Add New Meter</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your meter details to connect a new smart meter
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                  <FormField
                    control={form.control}
                    name="meterNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-aurora-green-light">Meter Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Gauge className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Enter your Kenya Power meter number"
                              className="pl-10 bg-slate-800 border-aurora-green/30 h-11"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Find this number on your electricity bill or meter display
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
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
                            defaultValue={field.value} 
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
                              defaultValue={field.value} 
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
                    {isLoading ? 'Connecting...' : 'Connect Smart Meter'}
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
            <h4 className="font-medium text-sm">Finding Your Meter Number:</h4>
            <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
              <li>• Check your latest Kenya Power bill</li>
              <li>• Look on the digital display of your smart meter</li>
              <li>• Call Kenya Power at 95551 for assistance</li>
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
              <li>• Ensure your meter number is correct</li>
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
