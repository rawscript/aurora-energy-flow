import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  notification_preferences?: Record<string, any>;
  meter_category?: string;
  notifications_enabled?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  isRead: boolean;
  tokenBalance?: number;
  estimatedDays?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  sourceTable?: string;
}

interface NotificationAction {
  id: string;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  icon?: React.ComponentType<any>;
}

interface NotificationStatus {
  has_notifications: boolean;
  total_count: number;
  unread_count: number;
  last_notification_date?: string;
  notification_types: string[];
  notifications_table_exists: boolean;
  ai_alerts_table_exists: boolean;
  status: 'empty' | 'all_read' | 'has_unread';
}

interface NotificationPreferences {
  preferences: Record<string, any>;
  has_meter: boolean;
  meter_category?: string;
  contact_methods: Record<string, boolean>;
  setup_status: Record<string, boolean>;
}

// Constants for consistent timing and rate limiting
const API_CALL_DEBOUNCE = 2000; // 2 seconds between API calls
const RETRY_DELAYS = [1000, 2000, 5000]; // Exponential backoff delays
const UPDATE_THROTTLE = 1500; // Throttle real-time updates
const MAX_NOTIFICATIONS = 100; // Prevent memory issues

// Utility function to debounce API calls
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user, session, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Stable user ID reference to prevent unnecessary re-renders
  const userId = useMemo(() => user?.id || null, [user?.id]);
  const hasValidSession = useMemo(() => 
    isAuthenticated && Boolean(session?.access_token && !session.expires_at || 
           (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000))), 
    [isAuthenticated, session?.access_token, session?.expires_at]
  );

  // Refs for managing API calls and state
  const subscriptionRef = useRef<any>(null);
  const lastApiCall = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);
  const isOperationInProgress = useRef(false);
  const initializationAttempted = useRef(false);

  // Create authenticated Supabase client using current session
  const getAuthenticatedClient = useCallback(() => {
    if (!session?.access_token || !hasValidSession) {
      console.log('No valid session for authenticated client');
      return null;
    }

    try {
      // Use the existing client with current session
      return supabase;
    } catch (error) {
      console.error('Error creating authenticated client:', error);
      return null;
    }
  }, [session?.access_token, hasValidSession]);

  // Fetch notifications using existing RPC functions
  const fetchNotificationData = useCallback(async (force = false) => {
    if (!userId || !hasValidSession) {
      console.log('No user or session, skipping notification fetch');
      return null;
    }

    // Rate limiting
    const now = Date.now();
    if (!force && (now - lastApiCall.current) < API_CALL_DEBOUNCE) {
      console.log('API call rate limited');
      return null;
    }

    if (isOperationInProgress.current) {
      console.log('Operation already in progress');
      return null;
    }

    const client = getAuthenticatedClient();
    if (!client) {
      console.log('No authenticated client available');
      return null;
    }

    isOperationInProgress.current = true;
    lastApiCall.current = now;

    try {
      console.log('Fetching notification data for user:', userId);

      // Check if user needs initialization first
      let needsInit = false;
      try {
        const { data: initData, error: initError } = await client
          .rpc('check_user_notification_initialization', { p_user_id: userId });
        
        if (!initError) {
          needsInit = initData as boolean;
          if (needsInit) {
            console.log('Initializing user notifications...');
            await client.rpc('initialize_user_notifications', { p_user_id: userId });
          }
        }
      } catch (error) {
        console.log('Initialization check failed:', error);
        // Continue anyway, might still be able to fetch notifications
      }

      // Fetch notifications using the safe function
      const { data: notifications, error: notifError } = await client
        .rpc('get_user_notifications_safe', {
          p_user_id: userId,
          p_limit: MAX_NOTIFICATIONS,
          p_unread_only: false
        });

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
        throw notifError;
      }

      // Fetch preferences separately
      let preferences = null;
      try {
        const { data: prefData, error: prefError } = await client
          .rpc('get_notification_preferences', { p_user_id: userId });
        
        if (!prefError) {
          preferences = prefData;
        } else {
          console.log('Could not fetch preferences:', prefError);
        }
      } catch (error) {
        console.log('Error fetching preferences:', error);
        // Don't fail the whole operation if preferences fail
      }

      return {
        notifications: notifications || [],
        preferences: preferences || null,
        needs_initialization: needsInit
      };

    } catch (error) {
      console.error('Error fetching notification data:', error);
      throw error;
    } finally {
      isOperationInProgress.current = false;
    }
  }, [userId, hasValidSession, getAuthenticatedClient]);

  // Debounced fetch function
  const debouncedFetch = useMemo(
    () => debounce(fetchNotificationData, API_CALL_DEBOUNCE),
    [fetchNotificationData]
  );

  // Process fetched data and update state
  const processNotificationData = useCallback((data: any) => {
    if (!data) return;

    try {
      const { notifications: notifData, preferences: prefData } = data;

      // Transform notifications
      const transformedNotifications: Notification[] = (notifData || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        severity: n.severity,
        isRead: n.is_read,
        tokenBalance: n.token_balance,
        estimatedDays: n.estimated_days,
        metadata: n.metadata,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        expiresAt: n.expires_at,
        sourceTable: n.source_table || 'notifications'
      }));

      // Update state efficiently
      setNotifications(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(transformedNotifications);
        return hasChanged ? transformedNotifications : prev;
      });

      const newUnreadCount = transformedNotifications.filter(n => !n.isRead).length;
      setUnreadCount(prev => prev !== newUnreadCount ? newUnreadCount : prev);

      // Update status
      const newStatus: NotificationStatus = {
        has_notifications: transformedNotifications.length > 0,
        total_count: transformedNotifications.length,
        unread_count: newUnreadCount,
        last_notification_date: transformedNotifications[0]?.createdAt,
        notification_types: [...new Set(transformedNotifications.map(n => n.type))],
        notifications_table_exists: true,
        ai_alerts_table_exists: false,
        status: transformedNotifications.length === 0 ? 'empty' : 
                (newUnreadCount > 0 ? 'has_unread' : 'all_read')
      };

      setStatus(newStatus);

      // Update preferences if available
      if (prefData) {
        const transformedPreferences: NotificationPreferences = {
          preferences: {
            token_low: prefData.token_low ?? true,
            token_depleted: prefData.token_depleted ?? true,
            power_restored: prefData.power_restored ?? true,
            energy_alert: prefData.energy_alert ?? true,
            low_balance_alert: prefData.low_balance_alert ?? true
          },
          has_meter: Boolean(prefData.meter_category),
          meter_category: prefData.meter_category || 'residential',
          contact_methods: {
            email: true,
            push: true,
            sms: false
          },
          setup_status: {
            meter_setup: Boolean(prefData.meter_category),
            notifications_enabled: prefData.notifications_enabled !== false
          }
        };

        setPreferences(transformedPreferences);
      }

      console.log(`Processed ${transformedNotifications.length} notifications, ${newUnreadCount} unread`);
    } catch (error) {
      console.error('Error processing notification data:', error);
    }
  }, []);

  // Main initialization function with retry logic
  const initializeNotifications = useCallback(async (force = false) => {
    if (!userId || !hasValidSession) return;
    
    if (!force && (initialized || initializationAttempted.current)) return;

    console.log('Initializing notifications for user:', userId);
    setLoading(true);
    setError(null);
    initializationAttempted.current = true;

    let lastError: any = null;

    // Retry with exponential backoff
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      try {
        const data = await fetchNotificationData(true);
        if (data) {
          processNotificationData(data);
          setInitialized(true);
          setError(null);
          console.log('Notifications initialized successfully');
          setLoading(false);
          return;
        }
      } catch (error) {
        lastError = error;
        console.error(`Initialization attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on auth errors
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          break;
        }

        // Wait before retry
        if (attempt < RETRY_DELAYS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
      }
    }

    console.error('Failed to initialize notifications after retries:', lastError);
    setError('Failed to load notifications');
    setInitialized(true); // Mark as initialized even if failed to prevent infinite retries
    setLoading(false);
  }, [userId, hasValidSession, initialized, fetchNotificationData, processNotificationData]);

  // Refresh notifications (public method)
  const refreshNotifications = useCallback(async () => {
    if (!userId || !hasValidSession) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotificationData(true);
      if (data) {
        processNotificationData(data);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      setError('Failed to refresh notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, hasValidSession, fetchNotificationData, processNotificationData]);

  // Optimized notification actions using session-aware client
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId || !hasValidSession) return false;

    const client = getAuthenticatedClient();
    if (!client) return false;

    try {
      const { data, error } = await client.rpc('mark_notification_read', {
        p_user_id: userId,
        p_notification_id: notificationId
      });

      if (error) throw error;

      if (data) {
        // Optimistic update
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, updatedAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Could not mark notification as read.',
        variant: 'destructive'
      });
    }
    
    return false;
  }, [userId, hasValidSession, getAuthenticatedClient, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!userId || !hasValidSession) return false;

    const client = getAuthenticatedClient();
    if (!client) return false;

    try {
      const { data, error } = await client.rpc('mark_all_notifications_read', {
        p_user_id: userId
      });

      if (error) throw error;

      const updatedCount = data || 0;
      if (updatedCount > 0) {
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, updatedAt: now })));
        setUnreadCount(0);

        toast({
          title: 'All notifications marked as read',
          description: `${updatedCount} notifications marked as read.`,
        });
        return true;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Could not mark all notifications as read.',
        variant: 'destructive'
      });
    }
    
    return false;
  }, [userId, hasValidSession, getAuthenticatedClient, toast]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!userId || !hasValidSession) return false;

    const client = getAuthenticatedClient();
    if (!client) return false;

    try {
      const { data, error } = await client.rpc('delete_notification', {
        p_user_id: userId,
        p_notification_id: notificationId
      });

      if (error) throw error;

      if (data) {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }

        toast({
          title: 'Notification deleted',
          description: 'The notification has been removed.',
        });
        return true;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Could not delete notification.',
        variant: 'destructive'
      });
    }
    
    return false;
  }, [userId, hasValidSession, getAuthenticatedClient, notifications, toast]);

  const getNotificationActions = useCallback((notification: Notification): NotificationAction[] => {
    const actions: NotificationAction[] = [];

    if (!notification.isRead) {
      actions.push({
        id: 'mark-read',
        label: 'Mark as Read',
        action: () => markAsRead(notification.id),
        variant: 'outline'
      });
    }

    if (notification.type === 'token_low' || notification.type === 'token_depleted') {
      actions.push({
        id: 'buy-tokens',
        label: 'Buy Tokens',
        action: () => window.location.hash = '#tokens',
        variant: 'default'
      });
    }

    actions.push({
      id: 'delete',
      label: 'Delete',
      action: () => deleteNotification(notification.id),
      variant: 'destructive'
    });

    return actions;
  }, [markAsRead, deleteNotification]);

  // Initialize notifications when user/session changes
  useEffect(() => {
    if (userId && hasValidSession && !initialized && !initializationAttempted.current) {
      initializeNotifications();
    } else if (!userId || !hasValidSession) {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setStatus(null);
      setPreferences(null);
      setError(null);
      setLoading(false);
      setInitialized(false);
      initializationAttempted.current = false;
    }
  }, [userId, hasValidSession, initialized, initializeNotifications]);

  // Set up real-time subscription with throttling
  useEffect(() => {
    if (!userId || !hasValidSession || !initialized) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    console.log('Setting up notification subscription for user:', userId);

    subscriptionRef.current = supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const now = Date.now();
        
        // Throttle updates to prevent excessive re-renders
        if (now - lastUpdateTime.current < UPDATE_THROTTLE) {
          console.log('Throttling notification update');
          return;
        }
        lastUpdateTime.current = now;

        try {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newNotification: Notification = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              type: payload.new.type,
              severity: payload.new.severity,
              isRead: payload.new.is_read,
              tokenBalance: payload.new.token_balance,
              estimatedDays: payload.new.estimated_days,
              metadata: payload.new.metadata,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
              expiresAt: payload.new.expires_at,
              sourceTable: 'notifications'
            };

            setNotifications(prev => {
              if (prev.some(n => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev.slice(0, MAX_NOTIFICATIONS - 1)];
            });

            if (!newNotification.isRead) {
              setUnreadCount(prev => prev + 1);
              
              if (newNotification.type !== 'welcome' && newNotification.severity !== 'low') {
                toast({
                  title: newNotification.title,
                  description: newNotification.message,
                  duration: 5000,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id 
                ? { ...n, isRead: payload.new.is_read, updatedAt: payload.new.updated_at }
                : n
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        } catch (error) {
          console.error('Error processing real-time notification update:', error);
        }
      })
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId, hasValidSession, initialized, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    initialized,
    status,
    preferences,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationActions
  };
};