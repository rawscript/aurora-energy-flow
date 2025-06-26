
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Sun, Battery } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [energyProvider, setEnergyProvider] = useState('');
  const [rate, setRate] = useState('0.15');
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
      duration: 3000,
    });
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
                  <SelectItem value="pacific-gas">Pacific Gas & Electric</SelectItem>
                  <SelectItem value="southern-california">Southern California Edison</SelectItem>
                  <SelectItem value="sdge">San Diego Gas & Electric</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
              className="w-full bg-gradient-to-r from-aurora-green to-aurora-blue hover:from-aurora-green/80 hover:to-aurora-blue/80 text-white"
            >
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
