import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Sun, Battery, Loader2, AlertTriangle, Zap, DollarSign, BatteryCharging } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getEnergySettings, saveEnergySettings } from '@/utils/energySettings';
import { useProfile } from '@/hooks/useProfile';
import type { EnergySettings } from '@/utils/energySettings';

interface NotificationPreferences {
  token_low: boolean;
  token_depleted: boolean;
  power_restored: boolean;
  energy_alert: boolean;
  low_balance_alert: boolean;
}

const SettingsNew = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [energyProvider, setEnergyProvider] = useState('');
  const [rate, setRate] = useState('0.15');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedProvider, setLastSavedProvider] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    token_low: true,
    token_depleted: true,
    power_restored: true,
    energy_alert: true,
    low_balance_alert: true
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, error, updateProfile } = useProfile();

  // Load cached provider from localStorage on initial render
  useEffect(() => {
    const cachedProvider = localStorage.getItem('energyProvider');
    if (cachedProvider) {
      setEnergyProvider(cachedProvider);
      setLastSavedProvider(cachedProvider);
    }
  }, []);

  // Initialize settings from profile data
  useEffect(() => {
    if (profile) {
      console.log("Initializing settings from profile:", profile);
      setEnergyProvider(profile.energy_provider || '');
      setNotifications(profile.notifications_enabled || true);
      setAutoOptimize(profile.auto_optimize || false);
      setRate(profile.energy_rate ? profile.energy_rate.toString() : '0.15');
      setLastSavedProvider(profile.energy_provider || '');

      // Initialize notification preferences
      if (profile.notification_preferences) {
        setNotificationPreferences({
          token_low: profile.notification_preferences.token_low || true,
          token_depleted: profile.notification_preferences.token_depleted || true,
          power_restored: profile.notification_preferences.power_restored || true,
          energy_alert: profile.notification_preferences.energy_alert || true,
          low_balance_alert: profile.notification_preferences.low_balance_alert || true
        });
      }

      // Cache the provider locally as a fallback
      if (profile.energy_provider) {
        localStorage.setItem('energyProvider', profile.energy_provider);
      }
    } else if (!loading && !error) {
      // Fallback to localStorage if no profile data
      const cachedProvider = localStorage.getItem('energyProvider');
      if (cachedProvider) {
        console.log("Using cached energyProvider:", cachedProvider);
        setEnergyProvider(cachedProvider);
      }
    }
  }, [profile, loading, error]);

  const handleSave = async () => {
    console.log("Current energyProvider before save:", energyProvider);

    // Validate energy provider
    if (!energyProvider || energyProvider.trim() === '') {
      toast({
        title: "Invalid Provider",
        description: "Please select a valid energy provider.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Validate energy rate
    const rateValue = parseFloat(rate);
    if (rate === '' || isNaN(rateValue) || rateValue < 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid energy rate (positive number).",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save settings.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (isSaving) {
      console.log("Save already in progress.");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Attempting to save settings with energyProvider:", energyProvider);

      // Create properly typed energy settings object with notification preferences
      const energySettings: EnergySettings & { notification_preferences: NotificationPreferences } = {
        energy_provider: energyProvider,
        notifications_enabled: notifications,
        auto_optimize: autoOptimize,
        energy_rate: rateValue,
        notification_preferences: notificationPreferences
      };

      // Update profile using the useProfile hook
      console.log("Updating profile with settings:", JSON.stringify(energySettings, null, 2));
      console.log("User ID:", user.id);
      const success = await updateProfile(energySettings);

      if (success) {
        console.log("Settings saved successfully. Updated energyProvider:", energyProvider);
        toast({
          title: "Settings Saved",
          description: "Your energy settings have been updated successfully.",
          duration: 3000,
        });
        // Update the last saved provider
        setLastSavedProvider(energyProvider);
        // Cache the provider locally as a fallback
        localStorage.setItem('energyProvider', energyProvider);
      } else {
        console.error("Failed to save settings");
        toast({
          title: "Save Failed",
          description: "Unable to save your settings. Please check your connection and try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      let errorMessage = "An unknown error occurred while saving your settings.";
      let errorTitle = "Save Error";

      if (error instanceof Error) {
        // Provide more specific error messages based on error type
        if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("auth")) {
          errorMessage = "Authentication error. Please sign in again.";
          errorTitle = "Authentication Required";
        } else if (error.message.includes("Invalid energy provider")) {
          errorMessage = "Please select a valid energy provider from the dropdown.";
          errorTitle = "Invalid Provider";
        } else if (error.message.includes("Invalid energy rate")) {
          errorMessage = "Please enter a valid energy rate (positive number).";
          errorTitle = "Invalid Rate";
        } else if (error.message.includes("Profile service not available")) {
          errorMessage = "Profile service is temporarily unavailable. Please try again later.";
          errorTitle = "Service Unavailable";
        } else if (error.message.includes("Invalid data provided")) {
          errorMessage = "Invalid data provided. Please check your inputs and try again.";
          errorTitle = "Invalid Data";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
      console.log("Save operation completed. Current energyProvider:", energyProvider);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: value
    }));
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
              <Select value={energyProvider || undefined} onValueChange={setEnergyProvider}>
                <SelectTrigger className="bg-slate-800 border-aurora-green/30">
                  <SelectValue placeholder="Select your provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solar">Solar</SelectItem>
                  <SelectItem value="KPLC">Kenya Power</SelectItem>
                  <SelectItem value="KenGEn">KenGEn</SelectItem>
                  <SelectItem value="IPP">Independent Power Producers (IPPs)</SelectItem>
                  <SelectItem value="Other">Other Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Energy Rate (KSh/kWh)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="bg-slate-800 border-aurora-green/30"
                placeholder="0.15"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-aurora-blue-light" />
                <Label htmlFor="notifications">Notifications</Label>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-aurora-yellow-light" />
                <Label htmlFor="auto-optimize">Auto Optimize</Label>
              </div>
              <Switch
                id="auto-optimize"
                checked={autoOptimize}
                onCheckedChange={setAutoOptimize}
              />
            </div>

            {/* Notification Preferences Section */}
            {notifications && (
              <Card className="bg-slate-800/50 border-aurora-green/20 mt-4">
                <CardHeader>
                  <CardTitle className="text-lg text-aurora-green-light flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <Label htmlFor="token-low">Low Token Alert</Label>
                    </div>
                    <Switch
                      id="token-low"
                      checked={notificationPreferences.token_low}
                      onCheckedChange={(checked) => handlePreferenceChange('token_low', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Battery className="h-5 w-5 text-red-400" />
                      <Label htmlFor="token-depleted">Token Depleted</Label>
                    </div>
                    <Switch
                      id="token-depleted"
                      checked={notificationPreferences.token_depleted}
                      onCheckedChange={(checked) => handlePreferenceChange('token_depleted', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-green-400" />
                      <Label htmlFor="power-restored">Power Restored</Label>
                    </div>
                    <Switch
                      id="power-restored"
                      checked={notificationPreferences.power_restored}
                      onCheckedChange={(checked) => handlePreferenceChange('power_restored', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                      <Label htmlFor="energy-alert">Energy Alerts</Label>
                    </div>
                    <Switch
                      id="energy-alert"
                      checked={notificationPreferences.energy_alert}
                      onCheckedChange={(checked) => handlePreferenceChange('energy_alert', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-blue-400" />
                      <Label htmlFor="low-balance">Low Balance</Label>
                    </div>
                    <Switch
                      id="low-balance"
                      checked={notificationPreferences.low_balance_alert}
                      onCheckedChange={(checked) => handlePreferenceChange('low_balance_alert', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-aurora-green hover:bg-aurora-green/90 text-white"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsNew;
    