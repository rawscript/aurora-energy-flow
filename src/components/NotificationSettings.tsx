import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, AlertTriangle, Battery, Zap, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface NotificationPreferences {
  token_low: boolean;
  token_depleted: boolean;
  power_restored: boolean;
  energy_alert: boolean;
  low_balance_alert: boolean;
}

interface NotificationSettingsProps {
  onSave: (preferences: NotificationPreferences) => void;
}

export const NotificationSettings = ({ onSave }: NotificationSettingsProps) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    token_low: true,
    token_depleted: true,
    power_restored: true,
    energy_alert: true,
    low_balance_alert: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { profile, loading, error, updateProfile } = useProfile();

  // Initialize preferences from profile data
  useEffect(() => {
    if (profile && profile.notification_preferences) {
      setPreferences({
        token_low: profile.notification_preferences.token_low || true,
        token_depleted: profile.notification_preferences.token_depleted || true,
        power_restored: profile.notification_preferences.power_restored || true,
        energy_alert: profile.notification_preferences.energy_alert || true,
        low_balance_alert: profile.notification_preferences.low_balance_alert || true
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) {
      toast({
        title: "Error",
        description: "Profile not loaded. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update profile with new notification preferences
      const success = await updateProfile({
        notification_preferences: preferences
      });

      if (success) {
        toast({
          title: "Notification Settings Saved",
          description: "Your notification preferences have been updated successfully.",
          duration: 3000,
        });

        // Call the onSave callback
        onSave(preferences);
      } else {
        toast({
          title: "Save Failed",
          description: "Unable to save your notification preferences. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving your notification preferences.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card className="bg-slate-800/50 border-aurora-green/20">
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
            checked={preferences.token_low}
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
            checked={preferences.token_depleted}
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
            checked={preferences.power_restored}
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
            checked={preferences.energy_alert}
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
            checked={preferences.low_balance_alert}
            onCheckedChange={(checked) => handlePreferenceChange('low_balance_alert', checked)}
          />
        </div>

        <div className="mt-6">
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
              'Save Notification Preferences'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
