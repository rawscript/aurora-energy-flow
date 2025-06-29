
import React, { useState } from 'react';
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
import { Meter, User, Phone, MapPin } from 'lucide-react';

const meterFormSchema = z.object({
  meterNumber: z.string().min(5, 'Meter number must be at least 5 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
});

type MeterFormValues = z.infer<typeof meterFormSchema>;

const MeterSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema),
    defaultValues: {
      meterNumber: '',
      fullName: user?.user_metadata?.full_name || '',
      phoneNumber: '',
      location: '',
    },
  });

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
    <div className="space-y-6">
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light flex items-center gap-2">
            <Meter className="h-6 w-6" />
            Smart Meter Setup
          </CardTitle>
          <p className="text-gray-400">
            Connect your Kenya Power smart meter to start monitoring your energy usage in real-time.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="meterNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-aurora-green-light">Meter Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Meter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Enter your Kenya Power meter number"
                          className="pl-10 bg-slate-800 border-aurora-green/30"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
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
                          className="pl-10 bg-slate-800 border-aurora-blue/30"
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
                          className="pl-10 bg-slate-800 border-aurora-purple/30"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
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
                          className="pl-10 bg-slate-800 border-emerald-500/30"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Help us provide location-specific energy tips
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-aurora-green to-aurora-blue hover:from-aurora-green/80 hover:to-aurora-blue/80"
              >
                {isLoading ? 'Connecting...' : 'Connect Smart Meter'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader>
          <CardTitle className="text-lg text-aurora-blue-light">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Finding Your Meter Number:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Check your latest Kenya Power bill</li>
              <li>• Look on the digital display of your smart meter</li>
              <li>• Call Kenya Power at 95551 for assistance</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Troubleshooting:</h4>
            <ul className="text-sm text-gray-400 space-y-1">
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
