import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { CONFIG } from '@/config/env';

const AuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    meterNumber: ''
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, setOnAuthSuccess } = useAuth();
  const isMobile = useIsMobile();

  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    return CONFIG.isSupabaseConfigured();
  };

  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from || '/dashboard';

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      console.log('User already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast({
        title: "Configuration Error",
        description: "Supabase is not properly configured. Please check your environment variables.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.fullName,
            phone_number: formData.phoneNumber,
            meter_number: formData.meterNumber
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Create profile with signup data immediately
        if (data.user) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: formData.email,
                full_name: formData.fullName,
                phone_number: formData.phoneNumber,
                meter_number: formData.meterNumber || null,
                meter_category: 'residential',
                industry_type: 'home',
                energy_provider: 'KPLC',
                notifications_enabled: true,
                auto_optimize: false,
                energy_rate: 0.15,
                notification_preferences: {
                  token_low: true,
                  token_depleted: true,
                  power_restored: true,
                  energy_alert: true,
                  low_balance_alert: true
                },
                kplc_meter_type: 'prepaid',
                low_balance_threshold: 100,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
            }
          } catch (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }

        // If user was created
        if (data.user) {
          toast({
            title: "Account Created!",
            description: data.session
              ? "Welcome to Aurora Energy! Your profile has been set up."
              : "Check your email to verify your account. Your profile data has been saved."
          });

          // Redirect to the original path or dashboard if user is already signed in
          if (data.session) {
            console.log('User signed up and session created, redirecting to:', from);
            navigate(from, { replace: true });
          }
        }
      }
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign up.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      toast({
        title: "Configuration Error",
        description: "Supabase is not properly configured. Please check your environment variables.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.session) {
        console.log('Sign in successful with session:', data.session);
        // The auth state will be updated by the useAuth hook's onAuthStateChange listener
        // We don't need to manually redirect here as the useEffect above will handle it
        // once the auth state is updated
      } else {
        console.log('Sign in successful but no session returned');
      }
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign in.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Set up auth success callback for automatic redirect
  useEffect(() => {
    console.log('Setting up auth success callback, redirect target:', from);
    const handleAuthSuccess = () => {
      console.log('Auth success callback triggered, redirecting to:', from);
      // Add a check to prevent duplicate toasts
      const lastToastTime = localStorage.getItem('lastAuthToastTime');
      const now = Date.now();
      
      // Only show toast if it's been more than 5 seconds since the last one
      if (!lastToastTime || now - parseInt(lastToastTime) > 5000) {
        localStorage.setItem('lastAuthToastTime', now.toString());
        toast({
          title: "Welcome!",
          description: "You have been signed in successfully."
        });
      }
      
      // Redirect to the original path or dashboard after successful authentication
      console.log('Executing navigation to:', from);
      navigate(from, { replace: true });
    };
    
    if (setOnAuthSuccess) {
      console.log('Registering auth success callback');
      setOnAuthSuccess(handleAuthSuccess);
    }
    
    // Also check if user is already authenticated when component mounts
    if (user && !authLoading) {
      console.log('User already authenticated on mount, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [setOnAuthSuccess, navigate, from, user, authLoading]);

  // Additional useEffect to handle user state changes directly
  useEffect(() => {
    if (user && !authLoading) {
      console.log('User state changed, redirecting to:', from);
      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate, from]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-aurora-green mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show configuration error if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm border-red-500/20">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-red-400">
                Configuration Error
              </h1>
            </div>
            <CardDescription className="text-muted-foreground">
              Supabase is not properly configured
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-300">
                The application cannot authenticate users because Supabase configuration is missing or incomplete.
              </p>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-aurora-green-light mb-2">Required Environment Variables:</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• VITE_SUPABASE_URL</li>
                  <li>• VITE_SUPABASE_PUBLIC_KEY</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                Please check your .env file and ensure these variables are properly set.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-2 sm:p-4">
      <Card className={`w-full ${isMobile ? 'max-w-sm mx-2' : 'max-w-md'} bg-slate-800/50 backdrop-blur-sm border-aurora-green/20`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-aurora-gradient rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-aurora-green-light to-aurora-blue-light bg-clip-text text-transparent">
              Aurora Energy
            </h1>
          </div>
          <CardDescription className="text-muted-foreground text-sm">
            Smart Energy Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 mb-6">
              <TabsTrigger value="signin" className="text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-aurora-green hover:bg-aurora-green/80 h-11 text-base"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meterNumber" className="text-sm">Meter Number</Label>
                  <Input
                    id="meterNumber"
                    name="meterNumber"
                    value={formData.meterNumber}
                    onChange={handleChange}
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-slate-700/50 border-slate-600 h-11 text-base"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-aurora-green hover:bg-aurora-green/80 h-11 text-base"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;