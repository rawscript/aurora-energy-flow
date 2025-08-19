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

  // Refresh session function to prevent logout
  const refreshSession = async () => {
    try {
      // Prevent too frequent refresh calls
      const now = Date.now();
      if (now - lastSessionCheck.current < 30000) { // 30 seconds minimum between checks
        return;
      }
      lastSessionCheck.current = now;

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
    }
  };

  // Check session validity and refresh if needed
  const checkSessionValidity = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking session:', error);
        return;
      }
      
      if (currentSession) {
        const expiresAt = currentSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
        
        // Refresh session if it expires in less than 10 minutes
        if (timeUntilExpiry < 600) {
          console.log('Session expiring soon, refreshing...');
          await refreshSession();
        }
      }
    } catch (error) {
      console.error('Exception checking session validity:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Don't show toast on initial load to avoid spam
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Set up session refresh interval if user is authenticated
          if (session) {
            // Clear any existing interval
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current);
            }
            
            // Check session every 5 minutes (less frequent to reduce load)
            sessionCheckInterval.current = setInterval(checkSessionValidity, 5 * 60 * 1000);
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
          sessionCheckInterval.current = setInterval(checkSessionValidity, 5 * 60 * 1000);
          
          // Create or update profile with sign up data (with better error handling)
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || null,
                phone_number: session.user.user_metadata?.phone_number || null,
                meter_number: session.user.user_metadata?.meter_number || null,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });

            if (profileError && profileError.code !== 'PGRST116') {
              console.error('Error creating/updating profile:', profileError);
            } else {
              console.log('Profile created/updated successfully');
            }
          } catch (error) {
            console.error('Error in profile upsert:', error);
          }
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