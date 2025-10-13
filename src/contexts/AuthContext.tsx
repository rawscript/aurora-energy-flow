import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { CONFIG } from '../config/env';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants
const SESSION_STORAGE_KEY = 'aurora_auth_session';
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CROSS_TAB_SYNC_KEY = 'aurora_auth_sync';
const MIN_SESSION_REFRESH_INTERVAL = 30 * 1000; // 30 seconds minimum between refreshes

// Cross-tab session synchronization
class CrossTabAuthSync {
    private static instance: CrossTabAuthSync;
    private listeners: Set<(session: Session | null) => void> = new Set();
    private lastBroadcast = 0;

    static getInstance(): CrossTabAuthSync {
        if (!CrossTabAuthSync.instance) {
            CrossTabAuthSync.instance = new CrossTabAuthSync();
        }
        return CrossTabAuthSync.instance;
    }

    private constructor() {
        // Listen for storage events (cross-tab communication)
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', this.handleStorageChange.bind(this));

            // Listen for focus events to sync when tab becomes active
            window.addEventListener('focus', this.handleWindowFocus.bind(this));
        }
    }

    private handleStorageChange(event: StorageEvent) {
        if (event.key === CROSS_TAB_SYNC_KEY && event.newValue) {
            try {
                const syncData = JSON.parse(event.newValue);
                if (syncData.type === 'session_update') {
                    this.notifyListeners(syncData.session);
                }
            } catch (error) {
                console.warn('Failed to parse cross-tab sync data:', error);
            }
        }
    }

    private handleWindowFocus() {
        // When tab becomes active, check for session updates
        try {
            const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            if (storedSession) {
                const session = JSON.parse(storedSession);
                this.notifyListeners(session);
            }
        } catch (error) {
            console.warn('Failed to sync session on window focus:', error);
        }
    }

    broadcastSessionUpdate(session: Session | null) {
        const now = Date.now();
        // Rate limit broadcasts to prevent spam
        if (now - this.lastBroadcast < 1000) return;

        this.lastBroadcast = now;

        try {
            const syncData = {
                type: 'session_update',
                session,
                timestamp: now
            };
            localStorage.setItem(CROSS_TAB_SYNC_KEY, JSON.stringify(syncData));

            // Clean up old sync data
            setTimeout(() => {
                try {
                    const current = localStorage.getItem(CROSS_TAB_SYNC_KEY);
                    if (current) {
                        const parsed = JSON.parse(current);
                        if (parsed.timestamp === now) {
                            localStorage.removeItem(CROSS_TAB_SYNC_KEY);
                        }
                    }
                } catch (error) {
                    // Ignore cleanup errors
                }
            }, 5000);
        } catch (error) {
            console.warn('Failed to broadcast session update:', error);
        }
    }

    addListener(callback: (session: Session | null) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(session: Session | null) {
        this.listeners.forEach(callback => {
            try {
                callback(session);
            } catch (error) {
                console.error('Error in cross-tab sync listener:', error);
            }
        });
    }
}

// Session storage utilities
const sessionStorage = {
    get(): Session | null {
        try {
            const stored = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!stored) return null;

            const session = JSON.parse(stored);

            // Check if session is still valid
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at > now) {
                return session;
            }

            // Session expired, remove it
            this.remove();
            return null;
        } catch (error) {
            console.warn('Failed to get stored session:', error);
            this.remove();
            return null;
        }
    },

    set(session: Session | null) {
        try {
            if (session) {
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            } else {
                this.remove();
            }
        } catch (error) {
            console.warn('Failed to store session:', error);
        }
    },

    remove() {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to remove stored session:', error);
        }
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Refs for managing state
    const isInitialized = useRef(false);
    const isSigningOut = useRef(false);
    const lastRefresh = useRef(0);
    const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const crossTabSync = useRef<CrossTabAuthSync>(CrossTabAuthSync.getInstance());
    const lastToastTime = useRef(0);

    // Computed auth state
    const isAuthenticated = Boolean(user && session);

    // Show toast with rate limiting
    const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
        const now = Date.now();
        // Rate limit toasts to prevent spam (5 seconds minimum between toasts)
        if (now - lastToastTime.current < 5000) return;

        lastToastTime.current = now;
        toast({ title, description, variant });
    }, [toast]);

    // Update session state and sync across tabs
    const updateSession = useCallback((newSession: Session | null, showSuccessToast = false) => {
        console.log('🔄 Updating session:', {
            hasSession: !!newSession,
            userId: newSession?.user?.id,
            showToast: showSuccessToast
        });

        setSession(newSession);
        setUser(newSession?.user || null);

        // Store session
        sessionStorage.set(newSession);

        // Broadcast to other tabs
        crossTabSync.current.broadcastSessionUpdate(newSession);

        // Show success toast only for actual sign-ins, not automatic refreshes
        if (showSuccessToast && newSession) {
            showToast(
                'Welcome back!',
                'You have been signed in successfully.'
            );
        }
    }, [showToast]);

    // Refresh session manually
    const refreshSession = useCallback(async (): Promise<void> => {
        const now = Date.now();

        // Rate limit refresh attempts
        if (now - lastRefresh.current < MIN_SESSION_REFRESH_INTERVAL) {
            console.log('⏳ Session refresh rate limited');
            return;
        }

        lastRefresh.current = now;

        if (!CONFIG.isSupabaseConfigured()) {
            console.warn('⚠️ Supabase not configured');
            return;
        }

        try {
            console.log('🔄 Refreshing session...');
            const { data: { session: newSession }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Session refresh error:', error);
                throw error;
            }

            updateSession(newSession);
            console.log('✅ Session refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh session:', error);
            showToast(
                'Session Error',
                'Failed to refresh your session. Please sign in again.',
                'destructive'
            );
        }
    }, [updateSession, showToast]);

    // Sign out
    const signOut = useCallback(async () => {
        if (isSigningOut.current) {
            console.log('🚫 Sign out already in progress');
            return;
        }

        isSigningOut.current = true;
        console.log('🚪 Signing out...');

        try {
            // Clear session state immediately
            updateSession(null);

            // Clear interval
            if (sessionCheckInterval.current) {
                clearInterval(sessionCheckInterval.current);
                sessionCheckInterval.current = null;
            }

            // Call Supabase signOut if configured
            if (CONFIG.isSupabaseConfigured()) {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('❌ Supabase sign out error:', error);
                }
            }

            showToast('Signed out', 'You have been signed out successfully.');

            // Redirect to auth page
            setTimeout(() => {
                window.location.href = '/auth';
            }, 1000);

        } catch (error) {
            console.error('❌ Sign out error:', error);
            showToast('Sign out error', 'There was an issue signing you out.', 'destructive');
        } finally {
            setTimeout(() => {
                isSigningOut.current = false;
            }, 2000);
        }
    }, [updateSession, showToast]);

    // Check session validity periodically
    const checkSessionValidity = useCallback(() => {
        if (!session || isSigningOut.current) return;

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;
        const timeUntilExpiry = expiresAt - now;

        console.log(`⏰ Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);

        // If session expired, sign out
        if (timeUntilExpiry <= 0) {
            console.log('⏰ Session expired, signing out');
            signOut();
        }
        // If session expires in less than 10 minutes, show warning
        else if (timeUntilExpiry <= 600) {
            showToast(
                'Session expiring soon',
                'Your session will expire soon. Please save your work.',
                'destructive'
            );
        }
    }, [session, signOut, showToast]);

    // Set up session monitoring
    useEffect(() => {
        if (session && !sessionCheckInterval.current) {
            console.log('⏰ Setting up session monitoring');
            sessionCheckInterval.current = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);
        } else if (!session && sessionCheckInterval.current) {
            console.log('⏰ Clearing session monitoring');
            clearInterval(sessionCheckInterval.current);
            sessionCheckInterval.current = null;
        }

        return () => {
            if (sessionCheckInterval.current) {
                clearInterval(sessionCheckInterval.current);
                sessionCheckInterval.current = null;
            }
        };
    }, [session, checkSessionValidity]);

    // Initialize auth state
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const initializeAuth = async () => {
            console.log('🚀 Initializing auth...');

            if (!CONFIG.isSupabaseConfigured()) {
                console.warn('⚠️ Supabase not configured');
                setLoading(false);
                return;
            }

            try {
                // Check for stored session first
                const storedSession = sessionStorage.get();
                if (storedSession) {
                    console.log('📱 Found valid stored session');
                    updateSession(storedSession);
                    setLoading(false);
                    return;
                }

                // Get session from Supabase
                console.log('🔍 Fetching session from Supabase...');
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ Error getting session:', error);
                } else {
                    updateSession(currentSession);
                }
            } catch (error) {
                console.error('❌ Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, [updateSession]);

    // Set up auth state listener
    useEffect(() => {
        if (!CONFIG.isSupabaseConfigured()) return;

        console.log('👂 Setting up auth state listener');

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            console.log('🔔 Auth state change:', event, { hasSession: !!newSession });

            if (isSigningOut.current && event !== 'SIGNED_OUT') {
                console.log('🚫 Ignoring auth event during sign out');
                return;
            }

            switch (event) {
                case 'SIGNED_IN':
                    // Only show toast for actual user-initiated sign-ins
                    updateSession(newSession, true);
                    break;

                case 'SIGNED_OUT':
                    updateSession(null);
                    break;

                case 'TOKEN_REFRESHED':
                    // Silent refresh, no toast
                    updateSession(newSession, false);
                    break;

                default:
                    console.log('🔔 Other auth event:', event);
                    break;
            }
        });

        return () => {
            console.log('🔇 Unsubscribing from auth state listener');
            subscription.unsubscribe();
        };
    }, [updateSession]);

    // Set up cross-tab synchronization
    useEffect(() => {
        console.log('🔗 Setting up cross-tab sync');

        const unsubscribe = crossTabSync.current.addListener((syncedSession) => {
            if (isSigningOut.current) return;

            console.log('🔗 Received cross-tab session update:', { hasSession: !!syncedSession });

            // Update local state without showing toast (to prevent duplicate notifications)
            setSession(syncedSession);
            setUser(syncedSession?.user || null);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const contextValue: AuthContextType = {
        user,
        session,
        loading,
        isAuthenticated,
        signOut,
        refreshSession
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};