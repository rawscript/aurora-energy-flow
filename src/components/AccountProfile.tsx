import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, Shield, LogOut, Save } from 'lucide-react';

export const AccountProfile = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const success = await updateProfile({
        full_name: fullName,
        phone_number: phoneNumber,
      });
      
      if (success) {
        toast({
          title: "Profile Updated",
          description: "Your personal information has been saved.",
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-6">
      <Card>
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <CardTitle className="text-3xl font-bold text-white flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
              <User className="h-8 w-8 text-aurora-green-light" />
            </div>
            MY PROFILE
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium text-base mt-2">
            Manage your mission-critical energy credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="space-y-6">
            <div className="grid gap-3">
              <Label htmlFor="email" className="font-bold text-xs uppercase tracking-[0.2em] text-slate-500">Email Identity</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-aurora-green-light transition-colors" />
                <Input 
                  id="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="pl-12 h-12 bg-white/5 border-white/10 text-slate-400 font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Immutable identity reference</p>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6 border-t border-white/5 pt-8">
              <div className="grid gap-3">
                <Label htmlFor="full_name" className="font-bold text-xs uppercase tracking-[0.2em] text-aurora-purple">Display Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-aurora-purple transition-colors" />
                  <Input 
                    id="full_name" 
                    placeholder="Enter your full name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-12 h-12 glass-input font-bold"
                  />
                </div>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="phone" className="font-bold text-xs uppercase tracking-[0.2em] text-aurora-green-light">Communication Path</Label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-aurora-green-light transition-colors" />
                  <Input 
                    id="phone" 
                    placeholder="Enter your phone number" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-12 h-12 glass-input font-bold"
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isUpdating || profileLoading}
                  className="w-full h-14 text-base font-bold tracking-wider"
                >
                  <Save className="h-5 w-5 mr-3" />
                  {isUpdating ? 'INITIALIZING SYNC...' : 'COMMIT CHANGES'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-500/20 bg-red-500/5 hover:border-red-500/40 transition-all duration-300">
        <CardHeader className="pb-6 border-b border-red-500/10">
          <CardTitle className="text-xl font-bold text-red-400 flex items-center gap-3">
            <Shield className="h-5 w-5" />
            SECURITY PROTOCOLS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <p className="text-base text-slate-400 mb-8 font-medium leading-relaxed">
            Ready to terminate your current session? You can sign out here. All your localized data will be safely persisted for your next visit.
          </p>
          <Button 
            onClick={() => signOut()}
            variant="destructive"
            className="w-full h-14 text-base font-bold tracking-wider bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400"
          >
            <LogOut className="h-5 w-5 mr-3" />
            TERMINATE SESSION
          </Button>
        </CardContent>
      </Card>
      
      <div className="text-center pt-8 pb-12">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          Aurora Energy Control v2.4.0 • Optimized for Glassmorphism
        </p>
      </div>
    </div>
  );
};

export default AccountProfile;
