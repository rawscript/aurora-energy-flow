
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Sun, Battery, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [energyProvider, setEnergyProvider] = useState('');
  const [rate, setRate] = useState('0.15');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedProvider, setLastSavedProvider] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Load cached provider from localStorage on initial render
  useEffect(() => {
    const cachedProvider = localStorage.getItem('energyProvider');
    if (cachedProvider) {
      setEnergyProvider(cachedProvider);
      setLastSavedProvider(cachedProvider);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Use RPC function to safely get or create profile
        const { data: profile, error } = await supabase
          .rpc('get_or_create_profile', {
            p_user_id: user.id,
            p_email: user.email,
            p_full_name: user.user_metadata?.full_name,
            p_phone_number: user.user_metadata?.phone_number,
            p_meter_number: user.user_metadata?.meter_number
          });

        if (error) {
          console.error("Error fetching profile:", error);
          // Fallback to localStorage if Supabase fails
          const cachedProvider = localStorage.getItem('energyProvider');
          if (cachedProvider) {
            setEnergyProvider(cachedProvider);
          }
        } else if (profile && profile.length > 0) {
          const userProfile = profile[0];
          setEnergyProvider(userProfile.energy_provider || 'KPLC');
          setNotifications(userProfile.notifications_enabled || true);
          setAutoOptimize(userProfile.auto_optimize || false);
          setRate(userProfile.energy_rate ? userProfile.energy_rate.toString() : '0.15');
          // Cache the provider locally
          localStorage.setItem('energyProvider', userProfile.energy_provider || 'KPLC');
        }
      } catch (error) {
        console.error("Unexpected error fetching profile:", error);
        // Fallback to localStorage if an unexpected error occurs
        const cachedProvider = localStorage.getItem('energyProvider');
        if (cachedProvider) {
          setEnergyProvider(cachedProvider);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (isSaving) {
      return; // Prevent multiple concurrent saves
    }

    setIsSaving(true);

    try {
      // Cache the current provider in localStorage as a fallback
      localStorage.setItem('energyProvider', energyProvider);

      // Use RPC function to safely update profile
      const { data: updatedProfile, error } = await supabase
        .rpc('safe_update_profile', {
          p_user_id: user.id,
          p_updates: {
            energy_provider: energyProvider,
            notifications_enabled: notifications,
            auto_optimize: autoOptimize,
            energy_rate: parseFloat(rate),
          }
        });

      if (error) {
        console.error("Supabase error:", error);
        toast({
          title: "Error",
          description: "Failed to save settings. Using cached values.",
          variant: "destructive",
          duration: 3000,
        });
        // Do not revert to last saved provider; keep the user's selection
      } else {
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully.",
          duration: 3000,
        });
        // Update the last saved provider
        setLastSavedProvider(energyProvider);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Using cached values.",
        variant: "destructive",
        duration: 3000,
      });
      // Do not revert to last saved provider; keep the user's selection
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-green-light flex items-center space-x-2">
            <SettingsIcon className="h-6 w-6" />
            <span>Energy Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="provider">Energy Provider</Label>
              <Select value={energyProvider} onValueChange={setEnergyProvider}>
                <SelectTrigger className="bg-slate-800 border-aurora-green/30">
                  <SelectValue placeholder="Select your provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solar">Solar</SelectItem>
                  <SelectItem value="KPLC">Kenya Power</SelectItem>
                  <SelectItem value="KenGEn">KenGEn</SelectItem>
                  <SelectItem value="IPP">Independent Power Producers (IPPs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Energy Rate ($/kWh)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="bg-slate-800 border-aurora-blue/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-blue-light flex items-center space-x-2">
            <Bell className="h-6 w-6" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Energy Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified about unusual usage patterns</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Bill Reminders</p>
              <p className="text-sm text-muted-foreground">Receive monthly bill estimates</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Peak Hour Alerts</p>
              <p className="text-sm text-muted-foreground">Notifications during peak pricing hours</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-aurora-card border-aurora-purple/20">
        <CardHeader>
          <CardTitle className="text-xl text-aurora-purple-light flex items-center space-x-2">
            <Sun className="h-6 w-6" />
            <span>Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Auto-Optimize</p>
              <p className="text-sm text-muted-foreground">Automatically adjust settings for efficiency</p>
            </div>
            <Switch checked={autoOptimize} onCheckedChange={setAutoOptimize} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Peak Hour Management</p>
              <p className="text-sm text-muted-foreground">Reduce usage during expensive hours</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Smart Scheduling</p>
              <p className="text-sm text-muted-foreground">Schedule high-usage activities optimally</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-aurora-card border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-xl text-emerald-400 flex items-center space-x-2">
            <Battery className="h-6 w-6" />
            <span>Data & Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Data Sharing</p>
              <p className="text-sm text-muted-foreground">Share anonymized data for research</p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Usage Analytics</p>
              <p className="text-sm text-muted-foreground">Collect detailed usage patterns</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-aurora-green to-aurora-blue hover:from-aurora-green/80 hover:to-aurora-blue/80 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
