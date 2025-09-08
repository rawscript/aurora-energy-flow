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

// Constants for consistent timing - optimized to minimize refreshes
const REFRESH_THRESHOLD = 30 * 60; // 30 minutes before expiry (increased significantly)
const CHECK_INTERVAL = 20 * 60 * 1000; // Check every 20 minutes (increased significantly)
const MIN_TIME_BETWEEN_REFRESHES = 5 * 60 * 1000; // 5 minutes minimum between refresh attempts
const MAX_RETRIES = 2;
const SESSION_PERSISTENCE_KEY = 'supabase.session';

// Helper function to safely parse stored session
const getStoredSession = (): Session | null => {
  try {
    const storedSession = localStorage.getItem(SESSION_PERSISTENCE_KEY);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      // Check if session is still valid (with generous buffer)
      const expiresAt = parsed.expires_at || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      // Consider session valid if it expires more than 5 minutes in the future
      if (expiresAt > currentTime + 300) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Error parsing stored session:', error);
  }
  return null;
};

// Helper function to safely store session
const storeSession = (session: Session | null) => {
  try {
    if (session) {
      localStorage.setItem(SESSION_PERSISTENCE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_PERSISTENCE_KEY);
    }
  } catch (error) {
    console.warn('Could not access localStorage:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Single interval reference
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  // State management refs
  const isInitialized = useRef(false);
  const isRefreshing = useRef(false);
  const lastRefreshAttempt = useRef(0);
  const isSigningOut = useRef(false);
  const onAuthSuccessCallback = useRef<(() => void) | null>(null);
  const refreshInProgress = useRef(false);

  // Set callback for successful auth
  const setOnAuthSuccess = useCallback((callback: () => void) => {
    onAuthSuccessCallback.current = callback;
  }, []);

  // Centralized interval management
  const resetSessionInterval = useCallback((newSession: Session | null) => {
    // Clear existing interval
    if (sessionCheckInterval.current) {
      clearInterval(sessionCheckInterval.current);
      sessionCheckInterval.current = null;
    }

    // Set up new interval only if we have a session
    if (newSession) {
      sessionCheckInterval.current = setInterval(() => {
        checkSessionValidity();
      }, CHECK_INTERVAL);
      
      console.log(`Session check interval set for every ${CHECK_INTERVAL / 60000} minutes`);
    }
  }, []);

  // Improved session refresh with proper guards
  const refreshSession = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing.current || isSigningOut.current || refreshInProgress.current) {
      console.log('Refresh already in progress or signing out, skipping');
      return;
    }

    // Rate limiting - prevent too frequent refreshes
    const now = Date.now();
    if (now - lastRefreshAttempt.current < MIN_TIME_BETWEEN_REFRESHES) {
      console.log('Refresh rate limited, skipping');
      return;
    }

    isRefreshing.current = true;
    refreshInProgress.current = true;
    lastRefreshAttempt.current = now;

    try {
      console.log('Starting session refresh...');

      // Get current session first
      const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
      
      if (getSessionError) {
        console.error('Error getting current session:', getSessionError);
        // If we can't get session and it's an auth error, sign out
        if (getSessionError.message.includes('auth') || getSessionError.message.includes('JWT')) {
          await signOut();
          return;
        }
        throw getSessionError;
      }

      if (!currentSession) {
        console.log('No current session, user needs to sign in again');
        await signOut();
        return;
      }

      // Check if refresh is actually needed
      const expiresAt = currentSession.expires_at || 0;
      const timeUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
      
      // Only refresh if close to expiry
      if (timeUntilExpiry > REFRESH_THRESHOLD) {
        console.log(`Session still valid for ${Math.floor(timeUntilExpiry / 60)} minutes, no refresh needed`);
        return;
      }

      // Attempt refresh with retry logic
      let refreshedSession: Session | null = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`Session refresh attempt ${attempt}/${MAX_RETRIES}`);
          
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (error) {
            lastError = error;
            console.error(`Refresh attempt ${attempt} failed:`, error);

            // Don't retry on certain errors
            if (error.message.includes('refresh_token_not_found') ||
                error.message.includes('invalid_grant') ||
                error.message.includes('invalid_refresh_token')) {
              console.log('Invalid refresh token, signing out');
              await signOut();
              return;
            }

            // For rate limits, wait longer before retry
            if (error.message.includes('429')) {
              console.log('Rate limited, waiting before retry...');
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
              continue;
            }

            // For network errors, wait and retry
            if (error.message.includes('network') || error.message.includes('fetch')) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }

            // For other errors, don't retry
            break;
          }

          if (session) {
            refreshedSession = session;
            console.log('Session refreshed successfully');
            break;
          }
        } catch (error) {
          lastError = error;
          console.error(`Exception in refresh attempt ${attempt}:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (!refreshedSession) {
        console.error('Failed to refresh session after all attempts:', lastError);
        
        // Only sign out on auth-related errors, not network issues
        if (lastError?.message?.includes('auth') || 
            lastError?.message?.includes('JWT') ||
            lastError?.message?.includes('invalid')) {
          await signOut();
        }
        return;
      }

      // Update state with new session
      setSession(refreshedSession);
      setUser(refreshedSession.user);
      
      // Persist session
      storeSession(refreshedSession);

      // Reset interval with new session timing
      resetSessionInterval(refreshedSession);

    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
    } finally {
      isRefreshing.current = false;
      refreshInProgress.current = false;
    }
  }, [resetSessionInterval]);

  // Check if session needs refresh with additional safeguards
  const checkSessionValidity = useCallback(async () => {
    if (!session || isRefreshing.current || isSigningOut.current || refreshInProgress.current) {
      return;
    }

    try {
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);

      console.log(`Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);

      // Only refresh if close to expiry
      if (timeUntilExpiry <= REFRESH_THRESHOLD) {
        console.log('Session needs refresh');
        await refreshSession();
      } else {
        console.log(`Session still valid for ${Math.floor(timeUntilExpiry / 60)} minutes, no refresh needed`);
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
    }
  }, [session, refreshSession]);

  // Improved sign out with proper cleanup
  const signOut = useCallback(async () => {
    if (isSigningOut.current) {
      return;
    }

    isSigningOut.current = true;
    refreshInProgress.current = true;

    try {
      console.log('Signing out user...');

      // Clear interval immediately
      resetSessionInterval(null);

      // Clear state
      setUser(null);
      setSession(null);

      // Clear persisted session
      storeSession(null);

      // Call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during signOut:', error);
        toast({
          title: "Sign Out Error",
          description: "There was an issue signing you out, but you've been logged out locally.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
          variant: "default"
        });
      }

      // Redirect to auth page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }

    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive"
      });
    } finally {
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        isSigningOut.current = false;
        refreshInProgress.current = false;
      }, 1000);
    }
  }, [resetSessionInterval, toast]);

  // Initialize auth state with persisted session
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeAuth = async () => {
      try {
        isInitialized.current = true;
        console.log('Initializing auth...');

        // First check for persisted session
        const persistedSession = getStoredSession();
        if (persistedSession) {
          console.log('Found persisted session, using it');
          setSession(persistedSession);
          setUser(persistedSession.user);
          
          // Set up session monitoring
          resetSessionInterval(persistedSession);
          
          // Call success callback if provided
          if (onAuthSuccessCallback.current) {
            onAuthSuccessCallback.current();
          }
          
          // Set loading to false early since we have a session
          setLoading(false);
          
          // Verify the session is still valid with Supabase
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error verifying persisted session:', error);
            // If verification fails, clear persisted session
            storeSession(null);
            setSession(null);
            setUser(null);
          } else if (!currentSession) {
            // If no current session, clear persisted session
            storeSession(null);
            setSession(null);
            setUser(null);
          } else {
            // If current session is different, update state
            if (currentSession.access_token !== persistedSession.access_token) {
              setSession(currentSession);
              setUser(currentSession.user);
              storeSession(currentSession);
              resetSessionInterval(currentSession);
            }
          }
          return;
        }

        // If no persisted session, get session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user || null);

          // Store in localStorage if session exists
          if (currentSession) {
            storeSession(currentSession);

            // Set up session monitoring
            resetSessionInterval(currentSession);

            // Call success callback if provided
            if (onAuthSuccessCallback.current) {
              onAuthSuccessCallback.current();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [resetSessionInterval]);

  // Set up auth state change listener with improved handling
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event);

      // Prevent processing during sign out
      if (isSigningOut.current) {
        return;
      }

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            
            // Persist session
            storeSession(newSession);

            // Reset interval for new session
            resetSessionInterval(newSession);

            // Call success callback only for SIGNED_IN (not TOKEN_REFRESHED to avoid loops)
            if (event === 'SIGNED_IN' && onAuthSuccessCallback.current) {
              onAuthSuccessCallback.current();
            }
          }
          break;

        case 'SIGNED_OUT':
          setSession(null);
          setUser(null);
          resetSessionInterval(null);
          
          // Clear persisted session
          storeSession(null);
          break;

        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
      // Clear interval on unmount
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [resetSessionInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSessionInterval(null);
    };
  }, [resetSessionInterval]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut, 
      refreshSession, 
      setOnAuthSuccess 
    }}>
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