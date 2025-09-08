import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setOnAuthSuccess: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants for consistent timing - optimized to minimize refreshes
// Since auto-refresh is disabled, these are for manual session validation only
const SESSION_VALIDITY_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes
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
  const isSigningOut = useRef(false);
  const onAuthSuccessCallback = useRef<(() => void) | null>(null);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user && !!session;
  }, [user, session]);

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
      }, SESSION_VALIDITY_CHECK_INTERVAL);
      
      console.log(`Session validity check interval set for every ${SESSION_VALIDITY_CHECK_INTERVAL / 60000} minutes`);
    }
  }, []);

  // Manual session refresh function (only used when explicitly called)
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      console.log('Manual session refresh requested...');
      
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting current session:', error);
        throw error;
      }

      if (!currentSession) {
        console.log('No current session, user needs to sign in again');
        await signOut();
        return;
      }

      // Update state with new session
      setSession(currentSession);
      setUser(currentSession.user);
      
      // Persist session
      storeSession(currentSession);

      // Reset interval with new session timing
      resetSessionInterval(currentSession);

      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Error during manual session refresh:', error);
      // Don't automatically sign out on refresh errors
      toast({
        title: "Session Refresh Failed",
        description: "There was an issue refreshing your session. You may need to sign in again.",
        variant: "destructive"
      });
    }
  }, [resetSessionInterval, toast]);

  // Check if session is still valid
  const checkSessionValidity = useCallback(async () => {
    if (!session || isSigningOut.current) {
      return;
    }

    try {
      const expiresAt = session.expires_at || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - currentTime;

      console.log(`Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);

      // If session has expired, sign out
      if (timeUntilExpiry <= 0) {
        console.log('Session has expired, signing out');
        await signOut();
      }
      // If session expires in less than 5 minutes, show warning but don't auto-refresh
      else if (timeUntilExpiry <= 300) {
        console.log('Session expires soon, showing warning');
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire soon. Save your work and consider signing in again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
    }
  }, [session, toast]);

  // Sign out function
  const signOut = useCallback(async () => {
    if (isSigningOut.current) {
      return;
    }

    isSigningOut.current = true;

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

  // Set up auth state change listener
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
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            
            // Persist session
            storeSession(newSession);

            // Reset interval for new session
            resetSessionInterval(newSession);

            // Call success callback
            if (onAuthSuccessCallback.current) {
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

        case 'TOKEN_REFRESHED':
          // With auto-refresh disabled, this should not happen
          // But if it does, handle it gracefully
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            
            // Persist session
            storeSession(newSession);

            // Reset interval for new session
            resetSessionInterval(newSession);
          }
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
      isAuthenticated: isAuthenticated(), // Call the function to get the boolean value
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