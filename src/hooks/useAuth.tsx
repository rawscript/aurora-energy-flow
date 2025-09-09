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
const SESSION_VALIDITY_CHECK_INTERVAL = 45 * 60 * 1000; // Check every 45 minutes (increased from 30)
const SESSION_PERSISTENCE_KEY = 'supabase.session';

// Helper function to safely parse stored session
const getStoredSession = (): Session | null => {
  try {
    const storedSession = localStorage.getItem(SESSION_PERSISTENCE_KEY);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      // Check if session is still valid (no buffer for more lenient validation)
      const expiresAt = parsed.expires_at || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      if (expiresAt > currentTime) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Error parsing stored session:', error);
  }
  return null;
};

// Helper function to check if a session is still valid without API calls
const isSessionStillValid = (session: Session | null): boolean => {
  if (!session) return false;
  
  const expiresAt = session.expires_at || 0;
  const currentTime = Math.floor(Date.now() / 1000);
  // Remove buffer entirely for more lenient validation
  return expiresAt > currentTime;
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
  const lastTokenRefresh = useRef<number>(0); // Track last token refresh time
  const tokenRefreshCount = useRef<number>(0); // Track token refresh frequency
  const lastSessionCheck = useRef<number>(0); // Track last session validity check

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    const result = !!user && !!session;
    console.log('useAuth isAuthenticated check:', {
      user: !!user,
      session: !!session,
      result
    });
    return result;
  }, [user, session]);

  // Add effect to log when session state changes
  useEffect(() => {
    console.log('Session state changed:', {
      user: !!user,
      session: !!session,
      userId: user?.id,
      expiresAt: session?.expires_at,
      currentTime: Math.floor(Date.now() / 1000),
      timeUntilExpiry: session?.expires_at ? (session.expires_at - Math.floor(Date.now() / 1000)) : null
    });
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
    console.log('Manual session refresh requested...');
    
    try {
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
      console.log('Updating session state with refreshed session');
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

  // Check if session is still valid with rate limiting
  const checkSessionValidity = useCallback(async () => {
    if (!session || isSigningOut.current) {
      console.log('Skipping session validity check - no session or signing out');
      return;
    }

    // Rate limiting - prevent too frequent checks
    const now = Date.now();
    if (now - lastSessionCheck.current < 300000) { // 5 minutes minimum between checks
      console.log('Session validity check rate limited');
      return;
    }
    lastSessionCheck.current = now;

    try {
      const expiresAt = session.expires_at || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - currentTime;

      console.log(`Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes (${timeUntilExpiry} seconds)`);

      // If session has expired, sign out
      if (timeUntilExpiry <= 0) {
        console.log('Session has expired, signing out');
        await signOut();
      }
      // If session expires in less than 10 minutes, show warning but don't auto-refresh
      else if (timeUntilExpiry <= 600) {
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
    console.log('Sign out requested, isSigningOut:', isSigningOut.current);
    
    if (isSigningOut.current) {
      console.log('Sign out already in progress, ignoring request');
      return;
    }

    isSigningOut.current = true;
    console.log('Setting isSigningOut to true');

    try {
      console.log('Signing out user...');

      // Clear interval immediately
      resetSessionInterval(null);

      // Clear state
      console.log('Clearing user and session state');
      setUser(null);
      setSession(null);

      // Clear persisted session
      storeSession(null);

      // Call Supabase signOut
      console.log('Calling Supabase signOut');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during signOut:', error);
        toast({
          title: "Sign Out Error",
          description: "There was an issue signing you out, but you've been logged out locally.",
          variant: "destructive"
        });
      } else {
        console.log('Sign out successful');
        toast({
          title: "Signed Out",
          description: "You have been signed out successfully.",
          variant: "default"
        });
      }

      // Redirect to auth page
      if (typeof window !== 'undefined') {
        console.log('Redirecting to auth page');
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
      console.log('Setting timeout to reset isSigningOut');
      setTimeout(() => {
        console.log('Resetting isSigningOut to false');
        isSigningOut.current = false;
      }, 1000);
    }
  }, [resetSessionInterval, toast]);

  // Initialize auth state with persisted session - OPTIMIZED to reduce API calls
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeAuth = async () => {
      try {
        isInitialized.current = true;
        console.log('Initializing auth...');

        // First check for persisted session
        const persistedSession = getStoredSession();
        
        if (persistedSession && isSessionStillValid(persistedSession)) {
          // Use persisted session without verification if it's still valid
          console.log('Found valid persisted session, using without verification');
          setSession(persistedSession);
          setUser(persistedSession.user);
          
          // Set up session monitoring
          resetSessionInterval(persistedSession);
          
          // Call success callback if provided
          if (onAuthSuccessCallback.current) {
            onAuthSuccessCallback.current();
          }
          
          setLoading(false);
          return; // Exit early, no need for API call
        }

        // Only make ONE getSession() call if no valid persisted session
        console.log('No valid persisted session, fetching from Supabase');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          // Clear any invalid persisted session
          storeSession(null);
        } else if (currentSession) {
          console.log('Got valid session from Supabase');
          setSession(currentSession);
          setUser(currentSession.user);

          // Store in localStorage
          storeSession(currentSession);

          // Set up session monitoring
          resetSessionInterval(currentSession);

          // Call success callback
          if (onAuthSuccessCallback.current) {
            onAuthSuccessCallback.current();
          }
        } else {
          console.log('No session available');
          setSession(null);
          setUser(null);
          // Clear any invalid persisted session
          storeSession(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setSession(null);
        setUser(null);
        // Clear any invalid persisted session
        storeSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [resetSessionInterval]);

  // Set up auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event, {
        userId: newSession?.user?.id,
        expiresAt: newSession?.expires_at,
        currentTime: Math.floor(Date.now() / 1000),
        timeUntilExpiry: newSession?.expires_at ? (newSession.expires_at - Math.floor(Date.now() / 1000)) : null
      });

      // Prevent processing during sign out
      if (isSigningOut.current) {
        console.log('Ignoring auth state change during sign out');
        return;
      }

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          if (newSession) {
            console.log('SIGNED_IN event received:', {
              userId: newSession.user.id,
              expiresAt: newSession.expires_at,
              currentTime: Math.floor(Date.now() / 1000),
              timeUntilExpiry: (newSession.expires_at || 0) - Math.floor(Date.now() / 1000)
            });
            
            console.log('Setting session and user state');
            setSession(newSession);
            setUser(newSession.user);
            
            // Persist session
            storeSession(newSession);

            // Reset interval for new session
            resetSessionInterval(newSession);

            // Call success callback
            if (onAuthSuccessCallback.current) {
              console.log('Calling auth success callback');
              onAuthSuccessCallback.current();
            }
          }
          break;

        case 'SIGNED_OUT':
          console.log('SIGNED_OUT event received');
          setSession(null);
          setUser(null);
          resetSessionInterval(null);
          
          // Clear persisted session
          storeSession(null);
          break;

        case 'TOKEN_REFRESHED':
          // With auto-refresh disabled, this should not happen
          // But if it does, handle it gracefully with rate limiting
          if (newSession) {
            const now = Date.now();
            
            // Rate limiting - prevent too many token refreshes in a short time
            if (now - lastTokenRefresh.current < 10000) { // 10 seconds (increased from 5)
              tokenRefreshCount.current++;
              if (tokenRefreshCount.current > 2) { // Reduced threshold
                console.log('Too many token refreshes in quick succession, ignoring');
                return;
              }
            } else {
              // Reset counter if more than 10 seconds have passed
              tokenRefreshCount.current = 0;
            }
            
            lastTokenRefresh.current = now;
            
            console.log('TOKEN_REFRESHED event received:', {
              userId: newSession.user.id,
              expiresAt: newSession.expires_at,
              currentTime: Math.floor(Date.now() / 1000),
              timeUntilExpiry: (newSession.expires_at || 0) - Math.floor(Date.now() / 1000),
              refreshCount: tokenRefreshCount.current
            });
            
            setSession(newSession);
            setUser(newSession.user);
            
            // Persist session
            storeSession(newSession);

            // Reset interval for new session
            resetSessionInterval(newSession);
            
            // Call success callback to notify listeners of the refreshed session
            if (onAuthSuccessCallback.current) {
              onAuthSuccessCallback.current();
            }
          }
          break;

        default:
          console.log('Other auth event:', event);
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