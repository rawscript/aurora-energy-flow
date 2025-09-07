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
  const sessionRefreshQueue = useRef<{ resolve: () => void }[]>([]);
  const isRefreshingSession = useRef(false);
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

  // Sign out function with improved error handling
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

            // Clear user and session
            setUser(null);
            setSession(null);

            // Redirect to auth page
            if (typeof window !== 'undefined') {
              window.location.href = '/auth';
            }
          } else {
            toast({
              title: "Signed Out",
              description: "You have been signed out successfully.",
              variant: "default"
            });

            // Redirect to auth page
            if (typeof window !== 'undefined') {
              window.location.href = '/auth';
            }
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

          // Clear user and session
          setUser(null);
          setSession(null);

          // Redirect to auth page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }
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

  // Refresh session function with improved error handling and rate limiting
  const refreshSession = async () => {
    return new Promise<void>(async (resolve) => {
      // Add to the refresh queue
      sessionRefreshQueue.current.push({ resolve });

      // If a refresh is already in progress, wait for it to complete
      if (isRefreshingSession.current) {
        console.log('Session refresh already in progress, queuing request');
        return;
      }

      // Prevent too frequent refresh calls (5 minutes minimum between checks)
      const now = Date.now();
      if (now - lastSessionCheck.current < 300000) { // 5 minutes cooldown
        console.log('Session refresh called too frequently, skipping');
        sessionRefreshQueue.current.forEach(item => item.resolve());
        sessionRefreshQueue.current = [];
        return;
      }

      isRefreshingSession.current = true;
      lastSessionCheck.current = now;
      console.log('Refreshing session...');

      try {
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting current session:', sessionError);
          if (!sessionError.message.includes('network') && !sessionError.message.includes('429')) {
            sessionRefreshQueue.current.forEach(item => item.resolve());
            sessionRefreshQueue.current = [];
            isRefreshingSession.current = false;
            resolve();
            return;
          }
        }

        if (!currentSession) {
          console.log('No current session found');
          sessionRefreshQueue.current.forEach(item => item.resolve());
          sessionRefreshQueue.current = [];
          isRefreshingSession.current = false;
          resolve();
          return;
        }

        // Check if session needs refresh (expires in less than 15 minutes)
        const expiresAt = currentSession.expires_at;
        const timeUntilExpiry = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;

        if (timeUntilExpiry > 900) { // More than 15 minutes left
          console.log(`Session still valid for ${Math.floor(timeUntilExpiry / 60)} minutes, no refresh needed`);
          sessionRefreshQueue.current.forEach(item => item.resolve());
          sessionRefreshQueue.current = [];
          isRefreshingSession.current = false;
          resolve();
          return;
        }

        // Refresh the session with retry logic and exponential backoff
        let retryCount = 0;
        const maxRetries = 3;
        let refreshedSession;
        let refreshError;

        while (retryCount < maxRetries && !refreshedSession) {
          try {
            console.log(`Attempting session refresh (attempt ${retryCount + 1})...`);
            const { data: { session }, error } = await supabase.auth.refreshSession();
            if (error) {
              refreshError = error;
              console.error(`Refresh attempt ${retryCount + 1} failed:`, error);

              // Only retry on network errors or rate limit errors
              if (!error.message.includes('network') &&
                  !error.message.includes('timeout') &&
                  !error.message.includes('fetch') &&
                  !error.message.includes('429')) {
                break;
              }

              // Exponential backoff with jitter
              const delay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 10000);
              console.log(`Waiting ${delay}ms before retry attempt ${retryCount + 2}...`);
              await new Promise(res => setTimeout(res, delay));
              retryCount++;
            } else {
              refreshedSession = session;
            }
          } catch (error) {
            console.error(`Exception during refresh attempt ${retryCount + 1}:`, error);
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 10000);
            console.log(`Waiting ${delay}ms before retry attempt ${retryCount + 2}...`);
            await new Promise(res => setTimeout(res, delay));
          }
        }

        if (refreshError) {
          console.error('Final error refreshing session:', refreshError);

          // Handle rate limit errors specifically
          if (refreshError.message?.includes('429')) {
            console.log('Rate limit exceeded, will retry on next interval');
            // Don't sign out for rate limit errors, just wait for next interval
          }
          // Only sign out on specific auth errors, not network or rate limit errors
          else if (refreshError.message?.includes('refresh_token_not_found') ||
                   refreshError.message?.includes('invalid_grant') ||
                   refreshError.message?.includes('invalid_refresh_token') ||
                   refreshError.message?.includes('auth') ||
                   refreshError.message?.includes('JWT')) {
            console.log('Session refresh failed with auth error, signing out');
            try {
              await supabase.auth.signOut();
              // Clear user and session
              setUser(null);
              setSession(null);
            } catch (signOutError) {
              console.error('Error during sign out after refresh failure:', signOutError);
            }
          }
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
          } else if (error.message.includes('429')) {
            console.log('Rate limit exceeded during session refresh, will retry on next interval');
          } else if (error.message.includes('auth') || error.message.includes('JWT')) {
            console.log('Auth error during session refresh, signing out');
            await signOut();
          }
        }
      } finally {
        // Resolve all queued promises
        sessionRefreshQueue.current.forEach(item => item.resolve());
        sessionRefreshQueue.current = [];
        isRefreshingSession.current = false;
        resolve();
      }
    });
  };

  // Check session validity with improved error handling and rate limiting
  const checkSessionValidity = async () => {
    try {
      if (!session || authStateChangeInProgress.current) return;

      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

      // Only refresh if session expires in less than 15 minutes
      if (timeUntilExpiry < 900) {
        console.log(`Session expiring in ${timeUntilExpiry} seconds, refreshing...`);

        // Use exponential backoff for session refresh with rate limit handling
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

            // Only retry on network errors, timeouts, or rate limit errors
            if (refreshError.message.includes('network') ||
                refreshError.message.includes('timeout') ||
                refreshError.message.includes('fetch') ||
                refreshError.message.includes('429')) {
              const delay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 10000); // Max 10 seconds with jitter
              console.log(`Waiting ${delay}ms before retry attempt ${retryCount + 1}...`);
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
      } else if (error.message.includes('429')) {
        // For rate limit errors, we'll try again on the next interval
        console.log('Rate limit exceeded during session check, will retry on next interval');
      } else if (error.message.includes('auth') || error.message.includes('JWT')) {
        // For auth errors, sign out the user
        console.log('Auth error during session check, signing out');
        await signOut();
      }
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up session check interval
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);

        // Set up session refresh interval
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
          const checkInterval = Math.max(timeUntilExpiry - 300, 300) * 1000; // Check 5 minutes before expiry, minimum 5 minutes

          console.log(`Initializing session check interval: ${Math.floor(checkInterval / 60000)} minutes`);
          sessionCheckInterval.current = setInterval(checkSessionValidity, checkInterval);
        }

        setLoading(false);
        isInitialized.current = true;

        // Call the onAuthSuccess callback if it exists
        if (onAuthSuccessCallback.current) {
          onAuthSuccessCallback.current();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
        isInitialized.current = true;
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user || null);

      // Call the onAuthSuccess callback if it exists
      if (onAuthSuccessCallback.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        onAuthSuccessCallback.current();
      }
    });

    // Clean up on unmount
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, []);

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
    