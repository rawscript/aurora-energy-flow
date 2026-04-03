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
    <div className="space-y-6 animate-fade-in">
      <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900">
        <CardHeader className="bg-aurora-green/10 border-b-2 border-black">
          <CardTitle className="text-2xl font-black text-black dark:text-white flex items-center gap-2">
            <User className="h-6 w-6" />
            MY ACCOUNT
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400 font-bold">
            Manage your personal information and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-black text-xs uppercase tracking-widest">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="pl-10 neo-input border-2 border-black bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Email cannot be changed</p>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name" className="font-black text-xs uppercase tracking-widest text-aurora-purple font-black">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="full_name" 
                    placeholder="Enter your full name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 neo-input border-2 border-black font-bold"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone" className="font-black text-xs uppercase tracking-widest text-aurora-green-light">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="phone" 
                    placeholder="Enter your phone number" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 neo-input border-2 border-black font-bold"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isUpdating || profileLoading}
                  className="w-full neo-button bg-aurora-green hover:bg-aurora-green-light text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-black"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="neo-card border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-900 border-red-500/50 overflow-hidden">
        <CardHeader className="bg-red-500/5 border-b-2 border-black">
          <CardTitle className="text-xl font-black text-red-600 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SECURITY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-bold">
            Ready to end your session? You can sign out here. All your data will be safely persisted for your next visit.
          </p>
          <Button 
            onClick={() => signOut()}
            variant="destructive"
            className="w-full neo-button bg-red-600 hover:bg-red-700 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-black"
          >
            <LogOut className="h-4 w-4 mr-2" />
            SIGN OUT OF AURORA
          </Button>
        </CardContent>
      </Card>
      
      <div className="text-center pb-8">
        <p className="text-xs text-slate-500 font-black uppercase tracking-tighter">
          Aurora Energy Monitor v2.4.0 • Built with Neobrutalism
        </p>
      </div>
    </div>
  );
};
