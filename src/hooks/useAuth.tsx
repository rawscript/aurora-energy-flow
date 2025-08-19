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
  const authStateChangeInProgress = useRef(false);

  // COMPLETELY ISOLATED refresh session function
  const refreshSession = async () => {
    try {
      // Prevent concurrent refresh attempts
      if (sessionRefreshInProgress.current) {
        console.log('Session refresh already in progress, skipping');
        return;
      }

      // Prevent too frequent refresh calls (increased to 5 minutes)
      const now = Date.now();
      if (now - lastSessionCheck.current < 300000) { // 5 minutes minimum between checks
        console.log('Session refresh called too frequently, skipping');
        return;
      }
      
      lastSessionCheck.current = now;
      sessionRefreshInProgress.current = true;

      console.log('Refreshing session...');
      
      // First check if current session is still valid
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting current session:', sessionError);
        return;
      }

      if (!currentSession) {
        console.log('No current session found');
        return;
      }

      // Check if session needs refresh (expires in less than 15 minutes)
      const expiresAt = currentSession.expires_at;
      const timeUntilExpiry = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;
      
      if (timeUntilExpiry > 900) { // More than 15 minutes left
        console.log(`Session still valid for ${Math.floor(timeUntilExpiry / 60)} minutes, no refresh needed`);
        return;
      }

      // Refresh the session
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        
        // Only sign out on specific auth errors, not network errors
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('invalid_grant')) {
          console.log('Session refresh failed with auth error, signing out');
          await supabase.auth.signOut();
        }
        return;
      }
      
      if (refreshedSession) {
        // Only update state if not in the middle of auth state change
        if (!authStateChangeInProgress.current) {
          setSession(refreshedSession);
          setUser(refreshedSession.user);
          console.log('Session refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Exception refreshing session:', error);
      // Don't force logout on exceptions
    } finally {
      sessionRefreshInProgress.current = false;
    }
  };

  // Check session validity - only refresh when really needed
  const checkSessionValidity = async () => {
    try {
      if (!session || authStateChangeInProgress.current) return;

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
      
      // Only refresh if session expires in less than 15 minutes
      if (timeUntilExpiry < 900) {
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

      // Use the safe database function
      const { data, error: createError } = await supabase
        .rpc('ensure_user_profile', {
          p_user_id: user.id,
          p_email: user.email,
          p_full_name: user.user_metadata?.full_name,
          p_phone_number: user.user_metadata?.phone_number,
          p_meter_number: user.user_metadata?.meter_number
        });

      if (createError) {
        console.error('Error ensuring profile exists:', createError);
      } else {
        console.log('Profile ensured successfully:', data?.message);
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
            
            // Check session every 30 minutes (much less frequent)
            sessionCheckInterval.current = setInterval(checkSessionValidity, 30 * 60 * 1000);
            
            // Ensure profile exists for authenticated user (with delay to avoid conflicts)
            setTimeout(() => {
              ensureProfileExists(session.user);
            }, 3000);
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

    // Listen for auth changes with protection against rapid changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Prevent rapid auth state changes from interfering
        if (authStateChangeInProgress.current) {
          console.log('Auth state change already in progress, skipping');
          return;
        }

        authStateChangeInProgress.current = true;
        console.log('Auth state changed:', event);
        
        try {
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
            sessionCheckInterval.current = setInterval(checkSessionValidity, 30 * 60 * 1000);
            
            // Ensure profile exists (with delay to avoid conflicts)
            setTimeout(() => {
              ensureProfileExists(session.user);
            }, 5000);
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
            
            // Reset all tracking variables
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
        } catch (error) {
          console.error('Error in auth state change handler:', error);
        } finally {
          // Add delay before allowing next auth state change
          setTimeout(() => {
            authStateChangeInProgress.current = false;
          }, 1000);
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
      // Prevent auth state changes during sign out
      authStateChangeInProgress.current = true;
      
      // Clear session refresh interval
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
      
      // Reset all tracking variables
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
    } finally {
      // Allow auth state changes after sign out
      setTimeout(() => {
        authStateChangeInProgress.current = false;
      }, 2000);
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