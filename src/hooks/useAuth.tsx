import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setOnAuthSuccess: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // We'll handle navigation in components that have access to the router
  // Don't use useNavigate here to avoid context errors
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const lastSessionCheck = useRef<number>(0);
  const sessionRefreshInProgress = useRef(false);
  const profileCreationInProgress = useRef(false);
  const authStateChangeInProgress = useRef(false);
  const authOperationQueue = useRef<(() => Promise<void>)[]>([]);
  const isProcessingQueue = useRef(false);
  const onAuthSuccessCallback = useRef<(() => void) | null>(null);

  // Set a callback to be called when authentication is successful
  const setOnAuthSuccess = useCallback((callback: () => void) => {
    onAuthSuccessCallback.current = callback;
  }, []);

  // Process the auth operation queue sequentially
  const processAuthQueue = async () => {
    if (isProcessingQueue.current) return;

    isProcessingQueue.current = true;

    while (authOperationQueue.current.length > 0) {
      const operation = authOperationQueue.current.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Error processing queued auth operation:', error);

          // If the error is related to authentication, sign out the user
          if (error.message?.includes('auth') || error.message?.includes('token') || error.message?.includes('JWT')) {
            console.log('Auth error in queued operation, signing out');
            await signOut();
          }
        }
      }
    }

    isProcessingQueue.current = false;
  };

  // Refresh session function with improved error handling
  const refreshSession = async () => {
    return new Promise<void>(async (resolve) => {
      // Enqueue the refresh operation
      authOperationQueue.current.push(async () => {
        try {
          // Prevent concurrent refresh attempts
          if (sessionRefreshInProgress.current) {
            console.log('Session refresh already in progress, skipping');
            resolve();
            return;
          }

          // Prevent too frequent refresh calls (5 minutes minimum between checks)
          const now = Date.now();
          if (now - lastSessionCheck.current < 300000) {
            console.log('Session refresh called too frequently, skipping');
            resolve();
            return;
          }

          lastSessionCheck.current = now;
          sessionRefreshInProgress.current = true;
          console.log('Refreshing session...');

          // Get current session
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Error getting current session:', sessionError);
            if (!sessionError.message.includes('network')) {
              resolve();
              return;
            }
          }

          if (!currentSession) {
            console.log('No current session found');
            resolve();
            return;
          }

          // Check if session needs refresh (expires in less than 15 minutes)
          const expiresAt = currentSession.expires_at;
          const timeUntilExpiry = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;

          if (timeUntilExpiry > 900) {
            console.log(`Session still valid for ${Math.floor(timeUntilExpiry / 60)} minutes, no refresh needed`);
            resolve();
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
                if (!error.message.includes('network') && !error.message.includes('timeout') && !error.message.includes('fetch')) {
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
              const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          if (refreshError) {
            console.error('Final error refreshing session:', refreshError);

            // Only sign out on specific auth errors, not network errors
            if (refreshError.message?.includes('refresh_token_not_found') ||
                refreshError.message?.includes('invalid_grant') ||
                refreshError.message?.includes('invalid_refresh_token') ||
                refreshError.message?.includes('auth') ||
                refreshError.message?.includes('JWT')) {
              console.log('Session refresh failed with auth error, signing out');
              await signOut();
            }
            resolve();
            return;
          }

          if (refreshedSession) {
            // Only update state if not in the middle of auth state change
            if (!authStateChangeInProgress.current) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              console.log('Session refreshed successfully');

              // Calculate dynamic interval: check 5 minutes before token expiry
              const expiresAt = refreshedSession.expires_at;
              const now = Math.floor(Date.now() / 1000);
              const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
              const checkInterval = Math.max(timeUntilExpiry - 300, 300) * 1000; // Check 5 minutes before expiry, minimum 5 minutes

              console.log(`Updating session check interval: ${Math.floor(checkInterval / 60000)} minutes`);

              // Update session refresh interval
              if (sessionCheckInterval.current) {
                clearInterval(sessionCheckInterval.current);
              }
              sessionCheckInterval.current = setInterval(checkSessionValidity, checkInterval);
            }
          }
        } catch (error) {
          console.error('Exception refreshing session:', error);

          // Provide more specific error handling
          if (error instanceof Error) {
            if (error.message.includes('network')) {
              console.log('Network error during session refresh, will retry on next interval');
            } else if (error.message.includes('auth') || error.message.includes('JWT')) {
              console.log('Auth error during session refresh, signing out');
              await signOut();
            }
          }
        } finally {
          sessionRefreshInProgress.current = false;
          resolve();
        }
      });

      // Process the queue
      await processAuthQueue();
    });
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
      } else if (error.message.includes('auth') || error.message.includes('JWT')) {
        // For auth errors, sign out the user
        console.log('Auth error during session check, signing out');
        await signOut();
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

      // First try using the get_or_create_profile function
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const { data, error: createError } = await supabase
            .rpc('get_or_create_profile', {
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
                createError.code === 'PGRST202' || // Function not found
                (typeof createError.message === 'string' && (
                  createError.message.includes('race condition') ||
                  createError.message.includes('concurrent') ||
                  createError.message.includes('network')
                ))) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
              continue;
            } else if (createError.message.includes('auth') || createError.message.includes('JWT')) {
              // For auth errors, sign out the user
              console.log('Auth error during profile creation, signing out');
              await signOut();
              break;
            } else {
              // Don't retry on other errors
              break;
            }
          }
          console.log('Profile ensured successfully:', data);
          success = true;
        } catch (error) {
          console.error(`Attempt ${retryCount + 1}: Exception ensuring profile exists:`, error);
          retryCount++;

          // If this is an auth error, sign out the user
          if (error.message.includes('auth') || error.message.includes('JWT')) {
            console.log('Auth error during profile creation, signing out');
            await signOut();
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
        }
      }

      // If RPC failed, try direct insert
      if (!success) {
        console.log('RPC failed, trying direct insert');
        try {
          const { error: fallbackError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              phone_number: user.user_metadata?.phone_number || '',
              meter_number: user.user_metadata?.meter_number || null,
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
              low_balance_threshold: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (fallbackError) {
            console.error('Fallback profile creation also failed:', fallbackError);
            // If this is an auth error, sign out the user
            if (fallbackError.message.includes('auth') || fallbackError.message.includes('JWT')) {
              console.log('Auth error during profile creation, signing out');
              await signOut();
            }
          } else {
            console.log('Profile ensured via fallback method');
          }
        } catch (fallbackError) {
          console.error('Fallback profile creation exception:', fallbackError);
          // If this is an auth error, sign out the user
          if (fallbackError.message.includes('auth') || fallbackError.message.includes('JWT')) {
            console.log('Auth error during profile creation, signing out');
            await signOut();
          }
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
          // If this is an auth error, clear the session
          if (error.message.includes('auth') || error.message.includes('JWT')) {
            console.log('Auth error getting session, clearing session');
            setSession(null);
            setUser(null);
          }
        } else {
          console.log('Initial session loaded:', session ? 'authenticated' : 'not authenticated');
          setSession(session);
          setUser(session?.user ?? null);

          // Set up session refresh interval if user is authenticated
          if (session) {
            // Clear any existing interval
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current);
              sessionCheckInterval.current = null;
            }

            // Calculate dynamic interval: check 5 minutes before token expiry
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
            const checkInterval = Math.max(timeUntilExpiry - 300, 300) * 1000; // Check 5 minutes before expiry, minimum 5 minutes

            console.log(`Setting dynamic session check interval: ${Math.floor(checkInterval / 60000)} minutes`);

            // Set dynamic interval
            sessionCheckInterval.current = setInterval(checkSessionValidity, checkInterval);

            // Ensure profile exists for authenticated user (immediate with conflict resolution)
            if (!profileCreationInProgress.current) {
              profileCreationInProgress.current = true;
              ensureProfileExists(session.user)
                .then(() => {
                  // Call the success callback if set
                  if (onAuthSuccessCallback.current) {
                    onAuthSuccessCallback.current();
                  }
                })
                .catch(error => {
                  console.error('Error ensuring profile:', error);
                  // If this is an auth error, sign out the user
                  if (error.message.includes('auth') || error.message.includes('JWT')) {
                    console.log('Auth error during profile creation, signing out');
                    signOut();
                  }
                });
            } else {
              // Call the success callback if set
              if (onAuthSuccessCallback.current) {
                onAuthSuccessCallback.current();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
        isInitialized.current = true;
      }
    };

    // Add a small delay to ensure the router is ready
    const timer = setTimeout(() => {
      getInitialSession();
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
    };
  }, [toast]);

  // Listen for auth changes with protection against rapid changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if we're already processing an auth state change
        if (authStateChangeInProgress.current) {
          console.log('Auth state change already in progress, skipping');
          return;
        }

        // Skip SIGNED_OUT events when we already have a session
        if (event === 'SIGNED_OUT' && session) {
          return;
        }

        authStateChangeInProgress.current = true;
        console.log('Auth state changed:', event);

        try {
          // If this is an auth error, clear the session
          if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && !session)) {
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }

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

            // Calculate dynamic interval: check 5 minutes before token expiry
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
            const checkInterval = Math.max(timeUntilExpiry - 300, 300) * 1000; // Check 5 minutes before expiry, minimum 5 minutes

            console.log(`Setting dynamic session check interval: ${Math.floor(checkInterval / 60000)} minutes`);
            sessionCheckInterval.current = setInterval(checkSessionValidity, checkInterval);

            // Ensure profile exists (immediate with conflict resolution)
            if (!profileCreationInProgress.current) {
              profileCreationInProgress.current = true;
              ensureProfileExists(session.user)
                .then(() => {
                  // Call the success callback if set
                  if (onAuthSuccessCallback.current) {
                    onAuthSuccessCallback.current();
                  }
                })
                .catch(error => {
                  console.error('Error ensuring profile:', error);
                  // If this is an auth error, sign out the user
                  if (error.message.includes('auth') || error.message.includes('JWT')) {
                    console.log('Auth error during profile creation, signing out');
                    signOut();
                  }
                });
            } else {
              // Call the success callback if set
              if (onAuthSuccessCallback.current) {
                onAuthSuccessCallback.current();
              }
            }
          }

          // Handle sign out
          if (event === 'SIGNED_OUT') {
            console.log('User signed out');

            // Clear session refresh interval
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current);
              sessionCheckInterval.current = null;
            }

            // Reset all tracking variables
            lastSessionCheck.current = 0;
            sessionRefreshInProgress.current = false;
            profileCreationInProgress.current = false;

            // Clear user and session
            setUser(null);
            setSession(null);

            // Redirect to auth page
            if (typeof window !== 'undefined') {
              window.location.href = '/auth';
            }
          }

          // Handle token refresh
          if (event === 'TOKEN_REFRESHED' && session) {
            console.log('Token refreshed successfully');
            setSession(session);
            setUser(session.user);

            // Calculate dynamic interval: check 5 minutes before token expiry
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
            const checkInterval = Math.max(timeUntilExpiry - 300, 300) * 1000; // Check 5 minutes before expiry, minimum 5 minutes

            console.log(`Updating session check interval: ${Math.floor(checkInterval / 60000)} minutes`);

            // Update session refresh interval
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current);
            }
            sessionCheckInterval.current = setInterval(checkSessionValidity, checkInterval);

            // Call the success callback if set
            if (onAuthSuccessCallback.current) {
              onAuthSuccessCallback.current();
            }
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
        sessionCheckInterval.current = null;
      }
    };
  }, [toast]);

  // Enhanced sign out function with better error handling
  const signOut = async () => {
    return new Promise<void>(async (resolve) => {
      // Enqueue the sign out operation
      authOperationQueue.current.push(async () => {
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

          // Clear user and session
          setUser(null);
          setSession(null);

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
          // Clear any remaining session data
          setUser(null);
          setSession(null);

          // Redirect to auth page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }

          // Allow auth state changes after sign out
          setTimeout(() => {
            authStateChangeInProgress.current = false;
            resolve();
          }, 2000);
        }
      });

      // Process the queue
      await processAuthQueue();
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession, setOnAuthSuccess }}>
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