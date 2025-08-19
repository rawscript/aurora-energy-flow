import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          toast({
            title: "Authentication Error",
            description: "There was a problem with your session. Please try signing in again.",
            variant: "destructive"
          });
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Clear loading state faster for better UX
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        toast({
          title: "Connection Error", 
          description: "Unable to connect to authentication service.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle successful sign in
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in successfully');
          
          // Create or update profile with sign up data
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

            if (profileError) {
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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  const signOut = async () => {
    try {
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
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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