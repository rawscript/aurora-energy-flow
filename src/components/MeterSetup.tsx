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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gauge, User, Phone, MapPin, History, Plus, Check, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

const meterFormSchema = z.object({
  meterNumber: z.string().min(5, 'Meter number must be at least 5 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
});

type MeterFormValues = z.infer<typeof meterFormSchema>;

interface MeterHistory {
  id: string;
  meter_number: string;
  full_name: string;
  phone_number: string;
  created_at: string;
  is_current: boolean;
}

const MeterSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [meterHistory, setMeterHistory] = useState<MeterHistory[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('current');
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema),
    defaultValues: {
      meterNumber: '',
      fullName: user?.user_metadata?.full_name || '',
      phoneNumber: '',
      location: '',
    },
  });

  // Fetch current profile and meter history
  useEffect(() => {
    if (user) {
      fetchCurrentProfile();
      fetchMeterHistory();
    }
  }, [user]);

  const fetchCurrentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentProfile(data);
        form.reset({
          meterNumber: data.meter_number || '',
          fullName: data.full_name || '',
          phoneNumber: data.phone_number || '',
          location: '', // We don't store location in profiles yet
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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
          is_current: false
        },
        {
          id: '2',
          meter_number: '98765432109',
          full_name: 'John Doe',
          phone_number: '+254700000002',
          created_at: '2024-06-20T14:30:00Z',
          is_current: false
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
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          full_name: historyItem.full_name,
          phone_number: historyItem.phone_number,
          meter_number: historyItem.meter_number,
        });

      if (error) throw error;

      toast({
        title: "Meter Selected",
        description: `Successfully connected to meter ${historyItem.meter_number}`,
      });

      fetchCurrentProfile();
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
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          meter_number: data.meterNumber,
        });

      if (error) throw error;

      toast({
        title: "Meter Details Updated",
        description: "Your smart meter has been successfully connected to Aurora Energy.",
      });
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
            Connect your Kenya Power smart meter to start monitoring your energy usage.
          </p>
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
          {currentProfile?.meter_number ? (
            <Card className="bg-aurora-card border-aurora-green/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-aurora-green-light">Connected Meter</CardTitle>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Meter Number</Label>
                    <p className="font-mono text-lg text-aurora-green-light">
                      {currentProfile.meter_number}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Account Holder</Label>
                    <p className="text-lg">{currentProfile.full_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Phone Number</Label>
                    <p className="text-lg">{currentProfile.phone_number || 'Not set'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400">Connected</span>
                    </div>
                  </div>
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
                  Connect your smart meter to start monitoring your energy usage
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
