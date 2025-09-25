import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Sun, Battery, Loader2, AlertTriangle, Zap, DollarSign, BatteryCharging, Building, Factory, CheckCircle, Wifi, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEnergyProvider, PROVIDER_CONFIGS } from '@/contexts/EnergyProviderContext';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [rate, setRate] = useState('0.15');
  const [batteryCount, setBatteryCount] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [encodedUserId, setEncodedUserId] = useState('');

  const [notificationPreferences, setNotificationPreferences] = useState({
    token_low: true,
    token_depleted: true,
    power_restored: true,
    energy_alert: true,
    low_balance_alert: true,
    maintenance_alert: true,
    billing_reminder: true
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, error, updateProfile } = useProfile();
  const { 
    provider, 
    setProvider, 
    providerConfig, 
    isLoading: providerLoading, 
    availableProviders 
  } = useEnergyProvider();

  // Initialize settings from profile data
  useEffect(() => {
    if (profile) {
      console.log("Initializing settings from profile:", profile);
      setNotifications(profile.notifications_enabled ?? true);
      setAutoOptimize(profile.auto_optimize ?? false);
      setRate(profile.energy_rate ? profile.energy_rate.toString() : providerConfig.settings.defaultRate.toString());
      setBatteryCount(profile.battery_count ? profile.battery_count.toString() : '0');

      // Initialize notification preferences
      if (profile.notification_preferences) {
        setNotificationPreferences({
          token_low: profile.notification_preferences.token_low ?? true,
          token_depleted: profile.notification_preferences.token_depleted ?? true,
          power_restored: profile.notification_preferences.power_restored ?? true,
          energy_alert: profile.notification_preferences.energy_alert ?? true,
          low_balance_alert: profile.notification_preferences.low_balance_alert ?? true,
          maintenance_alert: profile.notification_preferences.maintenance_alert ?? true,
          billing_reminder: profile.notification_preferences.billing_reminder ?? true
        });
      }
    }
  }, [profile, providerConfig.settings.defaultRate]);

  // Update rate when provider changes
  useEffect(() => {
    if (provider && PROVIDER_CONFIGS[provider]) {
      const defaultRate = PROVIDER_CONFIGS[provider].settings.defaultRate;
      if (rate === '0.15' || rate === '') { // Only update if using default rate
        setRate(defaultRate.toString());
      }
    }
  }, [provider, rate]);

  const handleProviderChange = async (newProvider: string) => {
    const success = await setProvider(newProvider);
    if (success) {
      // Update rate to provider default if current rate is default
      const newProviderConfig = PROVIDER_CONFIGS[newProvider];
      if (newProviderConfig && (rate === '0.15' || rate === '')) {
        setRate(newProviderConfig.settings.defaultRate.toString());
      }
    }
  };

  const handleSave = async () => {
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

    // Validate battery count for solar providers
    const batteryCountValue = parseInt(batteryCount);
    if (providerConfig.settings.supportsBatteries && (isNaN(batteryCountValue) || batteryCountValue < 0)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid battery count (positive number).",
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
      return;
    }

    setIsSaving(true);

    try {
      console.log("Saving settings for provider:", provider);

      // Create settings object
      const settings = {
        notifications_enabled: notifications,
        auto_optimize: autoOptimize,
        energy_rate: rateValue,
        notification_preferences: notificationPreferences,
        ...(providerConfig.settings.supportsBatteries && { battery_count: batteryCountValue })
      };

      console.log("Updating profile with settings:", settings);
      const success = await updateProfile(settings);

      if (success) {
        toast({
          title: "Settings Saved",
          description: "Your energy settings have been updated successfully.",
          duration: 3000,
        });
      } else { 
        toast({
          title: "Save Failed",
          description: "Unable to save your settings. Please check your connection and try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Error",
        description: "An unexpected error occurred while saving your settings.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getProviderIcon = (providerName: string) => {
    const config = PROVIDER_CONFIGS[providerName];
    if (!config) return <Zap className="h-4 w-4" />;
    
    switch (config.icon) {
      case 'Sun': return <Sun className="h-4 w-4" />;
      case 'Building': return <Building className="h-4 w-4" />;
      case 'Factory': return <Factory className="h-4 w-4" />;
      case 'Settings': return <SettingsIcon className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  // Function to encode user ID into a string of integers
  const encodeUserId = (userId: string): string => {
    // Simple encoding: convert each character to its char code and concatenate
    // This is a basic example - in a production environment, you might want to use
    // a more sophisticated encoding mechanism
    let encoded = '';
    for (let i = 0; i < userId.length; i++) {
      // Get the character code and pad with zeros to ensure consistent length
      const charCode = userId.charCodeAt(i).toString().padStart(3, '0');
      encoded += charCode;
    }
    return encoded;
  };

  // Initialize encoded user ID when user is available
  useEffect(() => {
    if (user?.id) {
      setEncodedUserId(encodeUserId(user.id));
    }
  }, [user]);

  const copyUserIdToClipboard = () => {
    if (encodedUserId) {
      navigator.clipboard.writeText(encodedUserId).then(() => {
        setIsCopied(true);
        toast({
          title: "Encoded User ID Copied",
          description: "Your encoded User ID has been copied to the clipboard.",
        });
        // Reset the copied state after 2 seconds
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy encoded User ID: ', err);
        toast({
          title: "Copy Failed",
          description: "Failed to copy encoded User ID to clipboard.",
          variant: "destructive"
        });
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User ID Section */}
      {user && (
        <Card className="bg-aurora-card border-aurora-green/20">
          <CardHeader>
            <CardTitle className="text-xl text-aurora-green-light flex items-center space-x-2">
              <Copy className="h-5 w-5" />
              <span>Secure User Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="user-id">Your Encoded User ID</Label>
              <div className="flex space-x-2">
                <Input
                  id="user-id"
                  value={encodedUserId}
                  readOnly
                  className="bg-slate-800 border-aurora-green/30 font-mono text-sm"
                />
                <Button
                  onClick={copyUserIdToClipboard}
                  variant="outline"
                  className="border-aurora-green/30 text-aurora-green-light hover:bg-aurora-green/20 whitespace-nowrap"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy ID
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is your secure encoded ID for smart meter registration. Use this instead of your original user ID for enhanced security.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Status Card */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-aurora-green-light flex items-center space-x-2">
              <SettingsIcon className="h-6 w-6" />
              <span>Energy Settings</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {provider && (
                <Badge 
                  variant="outline" 
                  className="text-aurora-green border-aurora-green/50"
                  style={{ color: providerConfig.colors.primary, borderColor: providerConfig.colors.primary + '50' }}
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  {providerConfig.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Energy Provider Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-base font-medium">Energy Provider</Label>
              <Select 
                value={provider || undefined} 
                onValueChange={handleProviderChange}
                disabled={providerLoading}
              >
                <SelectTrigger className="bg-slate-800 border-aurora-green/30 h-12">
                  <SelectValue placeholder="Select your energy provider" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-aurora-green/30">
                  {availableProviders.map((providerName) => {
                    const config = PROVIDER_CONFIGS[providerName];
                    return (
                      <SelectItem key={providerName} value={providerName}>
                        <div className="flex items-center space-x-2">
                          {getProviderIcon(providerName)}
                          <span>{config.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your energy provider to customize settings and features
              </p>
            </div>

            {/* Provider-specific info */}
            {provider && (
              <div className="p-4 bg-slate-800/50 rounded-lg border border-aurora-green/20">
                <div className="flex items-center space-x-3 mb-3">
                  {getProviderIcon(provider)}
                  <div>
                    <h4 className="font-medium" style={{ color: providerConfig.colors.primary }}>
                      {providerConfig.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {providerConfig.type === 'solar' ? 'Solar Energy Provider' : 
                       providerConfig.type === 'grid' ? 'Grid Energy Provider' : 
                       'Hybrid Energy Provider'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Device Type:</span>
                    <span className="ml-2 font-medium">{providerConfig.terminology.device}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="ml-2 font-medium">{providerConfig.terminology.payment}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="ml-2 font-medium">{providerConfig.terminology.credits}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Features:</span>
                    <span className="ml-2 font-medium">{providerConfig.features.length} available</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Energy Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder={providerConfig.settings.defaultRate.toString()}
              />
              <p className="text-xs text-muted-foreground">
                Default rate for {providerConfig.name}: KSh {providerConfig.settings.defaultRate}/kWh
              </p>
            </div>

            {/* Battery Count for Solar Providers */}
            {providerConfig.settings.supportsBatteries && (
              <div className="space-y-2">
                <Label htmlFor="batteries">Battery Count</Label>
                <Input
                  id="batteries"
                  type="number"
                  min="0"
                  value={batteryCount}
                  onChange={(e) => setBatteryCount(e.target.value)}
                  className="bg-slate-800 border-aurora-green/30"
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Number of batteries in your solar system
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-aurora-blue-light">General Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-aurora-blue-light" />
                <div>
                  <Label htmlFor="notifications">Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts and updates</p>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sun className="h-5 w-5 text-aurora-yellow-light" />
                <div>
                  <Label htmlFor="auto-optimize">Auto Optimize</Label>
                  <p className="text-xs text-muted-foreground">Automatically optimize energy usage</p>
                </div>
              </div>
              <Switch
                id="auto-optimize"
                checked={autoOptimize}
                onCheckedChange={setAutoOptimize}
              />
            </div>
          </div>

          <Separator />

          {/* Notification Preferences */}
          <div className="space-y-4">
            <h4 className="font-medium text-aurora-purple-light">Notification Preferences</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(notificationPreferences).map(([key, value]) => {
                const labels = {
                  token_low: 'Low Token Balance',
                  token_depleted: 'Token Depleted',
                  power_restored: 'Power Restored',
                  energy_alert: 'Energy Usage Alert',
                  low_balance_alert: 'Low Balance Alert',
                  maintenance_alert: 'Maintenance Reminder',
                  billing_reminder: 'Billing Reminder'
                };

                const descriptions = {
                  token_low: 'When token balance is low',
                  token_depleted: 'When tokens are completely used up',
                  power_restored: 'When power is restored after outage',
                  energy_alert: 'High energy usage notifications',
                  low_balance_alert: 'Account balance warnings',
                  maintenance_alert: 'System maintenance reminders',
                  billing_reminder: 'Monthly billing notifications'
                };

                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">{labels[key]}</Label>
                      <p className="text-xs text-muted-foreground">{descriptions[key]}</p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        setNotificationPreferences(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving || providerLoading}
            className="w-full bg-aurora-green hover:bg-aurora-green/80 h-12"
            style={{ 
              backgroundColor: provider ? providerConfig.colors.primary : undefined,
              borderColor: provider ? providerConfig.colors.secondary : undefined
            }}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Settings...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;