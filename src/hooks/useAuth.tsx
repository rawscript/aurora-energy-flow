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

  // COMPLETELY ISOLATED refresh session function with improved error handling
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
      let currentSession;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting current session:', sessionError);
          // If we can't get the session, try to sign out gracefully
          if (sessionError.message.includes('network')) {
            console.log('Network error getting session, will retry on next interval');
            return;
          }
          return;
        }
        currentSession = session;
      } catch (error) {
        console.error('Exception getting current session:', error);
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

      // Refresh the session with retry logic
      let retryCount = 0;
      const maxRetries = 2;
      let refreshedSession;
      let refreshError;

      while (retryCount < maxRetries && !refreshedSession) {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error) {
            refreshError = error;
            console.error(`Refresh attempt ${retryCount + 1} failed:`, error);

            // Only retry on network errors
            if (!error.message.includes('network') &&
                !error.message.includes('timeout') &&
                !error.message.includes('fetch')) {
              break;
            }

            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
          } else {
            refreshedSession = session;
          }
        } catch (error) {
          console.error(`Exception during refresh attempt ${retryCount + 1}:`, error);
          retryCount++;
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (refreshError) {
        console.error('Final error refreshing session:', refreshError);

        // Only sign out on specific auth errors, not network errors
        if (refreshError.message?.includes('refresh_token_not_found') ||
            refreshError.message?.includes('invalid_grant') ||
            refreshError.message?.includes('invalid_refresh_token')) {
          console.log('Session refresh failed with auth error, signing out');
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Error during sign out after refresh failure:', signOutError);
          }
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

      // Provide more specific error handling
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          console.log('Network error during session refresh, will retry on next interval');
        }
      }
      // Don't force logout on exceptions
    } finally {
      sessionRefreshInProgress.current = false;
    }
  };

  // Check session validity with improved network error handling
  const checkSessionValidity = async () => {
    try {
      if (!session || authStateChangeInProgress.current) return;

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

      // Only refresh if session expires in less than 15 minutes
      if (timeUntilExpiry < 900) {
        console.log(`Session expiring in ${timeUntilExpiry} seconds, refreshing...`);

        // Use exponential backoff for session refresh
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            await refreshSession();
            success = true;
          } catch (refreshError) {
            retryCount++;
            console.error(`Session refresh attempt ${retryCount} failed:`, refreshError);

            // Only retry on network errors or timeouts
            if (refreshError.message.includes('network') ||
                refreshError.message.includes('timeout') ||
                refreshError.message.includes('fetch')) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 seconds
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Don't retry on other errors
              break;
            }
          }
        }

        if (!success) {
          console.error('Failed to refresh session after retries');
          // Force sign out if we can't refresh the session
          await signOut();
        }
      } else {
        console.log(`Session valid for ${Math.floor(timeUntilExpiry / 60)} more minutes`);
      }
    } catch (error) {
      console.error('Exception checking session validity:', error);

      // Handle specific error cases
      if (error.message.includes('network')) {
        // For network errors, we'll try again on the next interval
        console.log('Network error during session check, will retry on next interval');
      }
    }
  };

  // Create or ensure profile exists with improved consistency handling
  const ensureProfileExists = async (user: User) => {
    if (profileCreationInProgress.current) {
      console.log('Profile creation already in progress, skipping');
      return;
    }

    try {
      profileCreationInProgress.current = true;
      console.log('Ensuring profile exists for user:', user.id);

      // Use the safe database function with retry logic for consistency
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const { data, error: createError } = await supabase
            .rpc('ensure_user_profile', {
              p_user_id: user.id,
              p_email: user.email,
              p_full_name: user.user_metadata?.full_name,
              p_phone_number: user.user_metadata?.phone_number,
              p_meter_number: user.user_metadata?.meter_number
            });

          if (createError) {
            console.error(`Attempt ${retryCount + 1}: Error ensuring profile exists:`, createError);

            // Only retry on specific errors
            if (createError.code === '23505' || // Unique violation
                createError.message.includes('race condition') ||
                createError.message.includes('concurrent')) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
              continue;
            } else {
              // Don't retry on other errors
              break;
            }
          } else {
            console.log('Profile ensured successfully:', data?.message);
            success = true;
          }
        } catch (error) {
          console.error(`Attempt ${retryCount + 1}: Exception ensuring profile exists:`, error);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
        }
      }

      if (!success) {
        console.error('Failed to ensure profile exists after retries');
        // Fallback: Try a direct insert if RPC fails
        try {
          const { error: fallbackError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name,
              phone_number: user.user_metadata?.phone_number,
              meter_number: user.user_metadata?.meter_number,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (fallbackError) {
            console.error('Fallback profile creation also failed:', fallbackError);
          } else {
            console.log('Profile ensured via fallback method');
          }
        } catch (fallbackError) {
          console.error('Fallback profile creation exception:', fallbackError);
        }
      }
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

  // Enhanced sign out function with better error handling
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
        // Handle specific error cases with user-friendly messages
        let errorMessage = "An error occurred during sign out.";

        if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes('auth')) {
          errorMessage = "Authentication error. You may already be signed out.";
        }

        console.error('Error signing out:', error);
        toast({
          title: "Sign Out Error",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);

      // Provide more specific error messages
      let errorMessage = "An unexpected error occurred during sign out.";

      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
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