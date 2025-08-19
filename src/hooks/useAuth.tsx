import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const lastSessionCheck = useRef<number>(0);
  const sessionRefreshInProgress = useRef(false);
  const profileCreationInProgress = useRef(false);

  // Refresh session function - only when really needed
  const refreshSession = async () => {
    try {
      // Prevent concurrent refresh attempts
      if (sessionRefreshInProgress.current) {
        console.log('Session refresh already in progress, skipping');
        return;
      }

      // Prevent too frequent refresh calls
      const now = Date.now();
      if (now - lastSessionCheck.current < 60000) { // 1 minute minimum between checks
        console.log('Session refresh called too frequently, skipping');
        return;
      }
      
      lastSessionCheck.current = now;
      sessionRefreshInProgress.current = true;

      console.log('Refreshing session...');
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        // Don't show toast for refresh errors to avoid spam
        return;
      }
      
      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.error('Exception refreshing session:', error);
    } finally {
      sessionRefreshInProgress.current = false;
    }
  };

  // Check session validity - only refresh when really needed
  const checkSessionValidity = async () => {
    try {
      if (!session) return;

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
      
      // Only refresh if session expires in less than 5 minutes
      if (timeUntilExpiry < 300) {
        console.log(`Session expiring in ${timeUntilExpiry} seconds, refreshing...`);
        await refreshSession();
      } else {
        console.log(`Session valid for ${Math.floor(timeUntilExpiry / 60)} more minutes`);
      }
    } catch (error) {
      console.error('Exception checking session validity:', error);
    }
  };

  // Create or ensure profile exists (safer approach)
  const ensureProfileExists = async (user: User) => {
    if (profileCreationInProgress.current) {
      console.log('Profile creation already in progress, skipping');
      return;
    }

    try {
      profileCreationInProgress.current = true;
      console.log('Ensuring profile exists for user:', user.id);

      // First check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!checkError && existingProfile) {
        console.log('Profile already exists, no need to create');
        return;
      }

      // Profile doesn't exist, create it
      console.log('Creating profile for new user');
      const { error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          phone_number: user.user_metadata?.phone_number || null,
          meter_number: user.user_metadata?.meter_number || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: true // Ignore if profile already exists
        });

      if (createError && createError.code !== '23505') {
        // Only log error if it's not a duplicate key error
        console.error('Error ensuring profile exists:', createError);
      } else {
        console.log('Profile ensured successfully');
      }
    } catch (error) {
      console.error('Exception ensuring profile exists:', error);
    } finally {
      profileCreationInProgress.current = false;
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Initial session loaded:', session ? 'authenticated' : 'not authenticated');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Set up session refresh interval if user is authenticated
          if (session) {
            // Clear any existing interval
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current);
            }
            
            // Check session every 15 minutes (increased interval to reduce load)
            sessionCheckInterval.current = setInterval(checkSessionValidity, 15 * 60 * 1000);
            
            // Ensure profile exists for authenticated user (with delay to avoid conflicts)
            setTimeout(() => {
              ensureProfileExists(session.user);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
        isInitialized.current = true;
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading to false after initial load
        if (isInitialized.current) {
          setLoading(false);
        }

        // Handle successful sign in
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in successfully');
          
          // Set up session refresh interval
          if (sessionCheckInterval.current) {
            clearInterval(sessionCheckInterval.current);
          }
          sessionCheckInterval.current = setInterval(checkSessionValidity, 15 * 60 * 1000);
          
          // Ensure profile exists (with delay to avoid conflicts with useProfile hook)
          setTimeout(() => {
            ensureProfileExists(session.user);
          }, 3000);
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          
          // Clear session refresh interval
          if (sessionCheckInterval.current) {
            clearInterval(sessionCheckInterval.current);
            sessionCheckInterval.current = null;
          }
          
          // Reset session refresh tracking
          lastSessionCheck.current = 0;
          sessionRefreshInProgress.current = false;
          profileCreationInProgress.current = false;
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed successfully');
          setSession(session);
          setUser(session.user);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [toast]);

  // Enhanced sign out function
  const signOut = async () => {
    try {
      // Clear session refresh interval
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
      
      // Reset session refresh tracking
      lastSessionCheck.current = 0;
      sessionRefreshInProgress.current = false;
      profileCreationInProgress.current = false;

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully."
        });
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};