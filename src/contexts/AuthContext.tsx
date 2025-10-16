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

// Constants - Much longer intervals to prevent 429 errors and token refresh spam
const SESSION_STORAGE_KEY = 'aurora_auth_session';
const SESSION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes - check session validity (increased)
const CROSS_TAB_SYNC_KEY = 'aurora_auth_sync';
const MIN_SESSION_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes minimum between manual refreshes (increased)
const TOKEN_REFRESH_BUFFER = 30 * 60; // 30 minutes before expiry (increased)
const MAX_REFRESH_ATTEMPTS = 2; // Reduced attempts to prevent spam
const REFRESH_COOLDOWN = 2 * 60 * 1000; // 2 minutes cooldown after failed refresh (increased)

// Safe session serialization to prevent "Cannot convert object to primitive value" errors
const safeSerializeSession = (session: Session | null): string | null => {
    if (!session) return null;

    try {
        // Create a safe copy with only serializable properties
        const safeSession = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
            user: session.user ? {
                id: session.user.id,
                email: session.user.email,
                phone: session.user.phone,
                created_at: session.user.created_at,
                updated_at: session.user.updated_at,
                email_confirmed_at: session.user.email_confirmed_at,
                phone_confirmed_at: session.user.phone_confirmed_at,
                user_metadata: session.user.user_metadata,
                app_metadata: session.user.app_metadata
            } : null
        };

        return JSON.stringify(safeSession);
    } catch (error) {
        console.warn('Failed to serialize session safely:', error);
        return null;
    }
};

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
        // When tab becomes active, check for session updates (rate limited)
        const now = Date.now();
        if (now - this.lastBroadcast < 10000) return; // Don't sync more than once per 10 seconds

        try {
            const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            if (storedSession) {
                const session = JSON.parse(storedSession);
                // Only notify if session is still valid
                const sessionExpiresAt = session?.expires_at || 0;
                const nowSeconds = Math.floor(now / 1000);
                if (sessionExpiresAt > nowSeconds) {
                    this.notifyListeners(session);
                }
            }
        } catch (error) {
            console.warn('Failed to sync session on window focus:', error);
        }
    }

    broadcastSessionUpdate(session: Session | null) {
        const now = Date.now();
        // Rate limit broadcasts to prevent spam (increased to 30 seconds to prevent 429 errors)
        if (now - this.lastBroadcast < 30000) return;

        this.lastBroadcast = now;

        try {
            // Use safe serialization to prevent object-to-primitive conversion errors
            const safeSessionData = session ? JSON.parse(safeSerializeSession(session) || 'null') : null;

            const syncData = {
                type: 'session_update',
                session: safeSessionData,
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

            // Be more lenient - allow 10 minute grace period for expired sessions
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at > (now - 600)) { // 10 minute grace period
                return session;
            }

            // Session expired beyond grace period, remove it
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
                const serialized = safeSerializeSession(session);
                if (serialized) {
                    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
                }
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
    const refreshAttempts = useRef(0);
    const lastRefreshError = useRef(0);
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

    // Update session state and sync across tabs (with deduplication)
    const updateSession = useCallback((newSession: Session | null, showSuccessToast = false) => {
        // Prevent unnecessary updates if session hasn't actually changed
        const currentToken = session?.access_token;
        const newToken = newSession?.access_token;

        // Only update if there's a meaningful change
        if (currentToken === newToken && !!session === !!newSession) {
            return; // No meaningful change, skip update
        }

        // Only log session updates when they're significant to reduce noise
        if (showSuccessToast || (!session && newSession) || (session && !newSession)) {
            console.log('🔄 Updating session:', {
                hasSession: !!newSession,
                userId: newSession?.user?.id,
                showToast: showSuccessToast,
                tokenChanged: currentToken !== newToken
            });
        }

        setSession(newSession);
        setUser(newSession?.user || null);

        // Store session
        sessionStorage.set(newSession);

        // Broadcast to other tabs (rate limited)
        crossTabSync.current.broadcastSessionUpdate(newSession);

        // Show success toast only for actual sign-ins, not automatic refreshes
        if (showSuccessToast && newSession) {
            showToast(
                'Welcome back!',
                'You have been signed in successfully.'
            );
        }
    }, [session?.access_token, showToast]);

    // Sign out - moved before refreshSession to fix dependency order
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

            // Redirect to auth page (only if not already on auth page)
            setTimeout(() => {
                if (!window.location.pathname.includes('/auth')) {
                    window.location.href = '/auth';
                }
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

    // Refresh session manually with enhanced rate limiting and 429 error handling
    const refreshSession = useCallback(async (): Promise<void> => {
        const now = Date.now();

        // Check if we're in cooldown after a failed refresh
        if (now - lastRefreshError.current < REFRESH_COOLDOWN) {
            console.log('⏳ Session refresh in cooldown after error');
            return;
        }

        // Rate limit refresh attempts
        if (now - lastRefresh.current < MIN_SESSION_REFRESH_INTERVAL) {
            console.log('⏳ Session refresh rate limited');
            return;
        }

        // Check max attempts
        if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
            console.log('� Meax refresh attempts reached, signing out');
            signOut();
            return;
        }

        lastRefresh.current = now;
        refreshAttempts.current++;

        if (!CONFIG.isSupabaseConfigured()) {
            console.warn('⚠️ Supabase not configured');
            return;
        }

        try {
            console.log(`🔄 Refreshing session (attempt ${refreshAttempts.current}/${MAX_REFRESH_ATTEMPTS})...`);
            const { data: { session: newSession }, error } = await supabase.auth.getSession();

            if (error) {
                // Handle 429 errors specifically
                if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
                    console.warn('⚠️ Rate limited by Supabase, backing off');
                    lastRefreshError.current = now;
                    return;
                }
                console.error('❌ Session refresh error:', error);
                throw error;
            }

            // Reset attempts on success
            refreshAttempts.current = 0;
            updateSession(newSession);
            console.log('✅ Session refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh session:', error);
            lastRefreshError.current = now;

            // Only show toast on final attempt to avoid spam
            if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) {
                showToast(
                    'Session Error',
                    'Failed to refresh your session. Please sign in again.',
                    'destructive'
                );
            }
        }
    }, [updateSession, showToast, signOut]);

    // Check session validity periodically
    const checkSessionValidity = useCallback(() => {
        if (!session || isSigningOut.current) return;

        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;
        const timeUntilExpiry = expiresAt - now;

        // Only log every hour to reduce noise
        if (timeUntilExpiry % 3600 < 300) {
            console.log(`⏰ Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
        }

        // Give 10 minute grace period before signing out to allow for token refresh
        if (timeUntilExpiry <= -600) { // 10 minutes past expiry
            console.log('⏰ Session expired beyond grace period, signing out');
            signOut();
            return;
        }

        // Show warning much earlier (1 hour before expiry) but only once
        if (timeUntilExpiry <= 3600 && timeUntilExpiry > 3540) { // Between 59-60 minutes
            showToast(
                'Session expiring soon',
                'Your session will expire in about an hour. Please save your work.',
                'destructive'
            );
        }
    }, [session, signOut, showToast]);

    // Set up session monitoring (with reduced logging)
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
    }, [session?.access_token, checkSessionValidity]); // Only depend on access_token, not entire session object

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
                // Only log session fetch on initialization to reduce noise
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
            // Only log important events to reduce console noise
            if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
                console.log('🔔 Auth state change:', event, { hasSession: !!newSession });
            }

            if (isSigningOut.current && event !== 'SIGNED_OUT') {
                return;
            }

            switch (event) {
                case 'SIGNED_IN':
                    // Reset refresh attempts on successful sign in
                    refreshAttempts.current = 0;
                    updateSession(newSession, true);
                    break;

                case 'SIGNED_OUT':
                    // Reset refresh attempts on sign out
                    refreshAttempts.current = 0;
                    updateSession(null);
                    break;

                case 'TOKEN_REFRESHED':
                    // IGNORE token refresh events to prevent excessive updates and 429 errors
                    // We'll rely on manual session checks instead of automatic token refreshes
                    console.log('� IgnoTring TOKEN_REFRESHED event to prevent 429 errors');
                    break;

                case 'USER_UPDATED':
                    // Only update if user actually changed
                    if (newSession?.user?.id !== session?.user?.id) {
                        updateSession(newSession, false);
                    }
                    break;

                case 'INITIAL_SESSION':
                    // Handle initial session load - be conservative
                    if (newSession && !session && !isInitialized.current) {
                        updateSession(newSession, false);
                    }
                    break;

                default:
                    // Ignore all other events to prevent loops and excessive requests
                    console.log('🔇 Ignoring auth event:', event);
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

            // Only log cross-tab updates when they're significant
            if ((!session && syncedSession) || (session && !syncedSession)) {
                console.log('🔗 Received cross-tab session update:', { hasSession: !!syncedSession });
            }

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