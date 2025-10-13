import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Constants for consistent timing and rate limiting - OPTIMIZED
const API_CALL_DEBOUNCE = 5000; // 5 seconds between API calls (increased from 2)
const RETRY_DELAYS = [2000, 5000, 10000]; // Longer exponential backoff delays
const UPDATE_THROTTLE = 3000; // 3 seconds throttle for real-time updates (increased from 1.5)
const MAX_NOTIFICATIONS = 50; // Reduced to prevent memory issues
const MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between refreshes
const MAX_CONCURRENT_REQUESTS = 2; // Limit concurrent requests



// Create a throttled version for critical operations
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle = false;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

// Notification interfaces
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
  status: 'empty' | 'all_read' | 'has_unread';
}

interface NotificationPreferences {
  preferences: Record<string, any>;
  has_meter: boolean;
  meter_category?: string;
  contact_methods: Record<string, boolean>;
  setup_status: Record<string, boolean>;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { userId, hasValidSession, callRpc } = useAuthenticatedApi();
  const { toast } = useToast();

  // Refs for managing API calls and state - ENHANCED RATE LIMITING
  const subscriptionRef = useRef<any>(null);
  const lastApiCall = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);
  const lastRefreshTime = useRef<number>(0);
  const isOperationInProgress = useRef(false);
  const initializationAttempted = useRef(false);
  const subscriptionSetupInProgress = useRef(false);
  const activeRequestCount = useRef<number>(0);
  const requestQueue = useRef<Array<() => Promise<any>>>([]);

  // Enhanced request queue management
  const processRequestQueue = useCallback(async () => {
    if (activeRequestCount.current >= MAX_CONCURRENT_REQUESTS || requestQueue.current.length === 0) {
      return;
    }

    const request = requestQueue.current.shift();
    if (request) {
      activeRequestCount.current++;
      try {
        await request();
      } finally {
        activeRequestCount.current--;
        // Process next request after a delay
        setTimeout(processRequestQueue, 1000);
      }
    }
  }, []);

  // Optimized fetch notifications using centralized auth with enhanced rate limiting
  const fetchNotificationData = useCallback(async (force = false) => {
    if (!userId || !hasValidSession()) {
      console.log('No user or session, skipping notification fetch');
      return null;
    }

    // Enhanced rate limiting
    const now = Date.now();
    if (!force && (now - lastApiCall.current) < API_CALL_DEBOUNCE) {
      console.log('API call rate limited - too soon since last call');
      return null;
    }

    if (!force && (now - lastRefreshTime.current) < MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited - minimum interval not met');
      return null;
    }

    if (isOperationInProgress.current) {
      console.log('Operation already in progress');
      return null;
    }

    if (activeRequestCount.current >= MAX_CONCURRENT_REQUESTS) {
      console.log('Too many concurrent requests, queuing...');
      return new Promise((resolve) => {
        requestQueue.current.push(async () => {
          const result = await fetchNotificationData(force);
          resolve(result);
        });
        processRequestQueue();
      });
    }

    isOperationInProgress.current = true;
    lastApiCall.current = now;
    lastRefreshTime.current = now;

    try {
      console.log('Fetching notification data for user:', userId);

      // Check if user needs initialization first using authenticated API
      let needsInit = false;
      try {
        needsInit = await callRpc('check_user_notification_initialization', {}, { 
          showErrorToast: false,
          cacheKey: `init_check_${userId}`,
          cacheDuration: 60000 // Cache for 1 minute
        });
        
        if (needsInit) {
          console.log('Initializing user notifications...');
          await callRpc('initialize_user_notifications', {}, { showErrorToast: false });
        }
      } catch (error) {
        console.log('Initialization check failed:', error);
        // Continue anyway, might still be able to fetch notifications
      }

      // Fetch notifications using authenticated API
      let notifications = [];
      try {
        notifications = await callRpc('get_user_notifications_safe', {
          p_limit: MAX_NOTIFICATIONS,
          p_unread_only: false
        }, { 
          showErrorToast: false,
          cacheKey: `notifications_${userId}`,
          cacheDuration: 30000 // Cache for 30 seconds
        });
      } catch (error) {
        console.log('Error fetching notifications:', error);
        // Don't fail the whole operation if notifications fail
      }

      // Fetch preferences separately using authenticated API
      let preferences = null;
      try {
        preferences = await callRpc('get_notification_preferences', {}, { 
          showErrorToast: false,
          cacheKey: `preferences_${userId}`,
          cacheDuration: 300000 // Cache for 5 minutes
        });
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
      // Return empty data instead of throwing to prevent UI crashes
      return {
        notifications: [],
        preferences: null,
        needs_initialization: false
      };
    } finally {
      isOperationInProgress.current = false;
    }
  }, [userId, hasValidSession(), callRpc]);

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
    if (!userId || !hasValidSession()) return;

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
  }, [userId, hasValidSession(), initialized, fetchNotificationData, processNotificationData]);

  // Refresh notifications (public method) with enhanced rate limiting
  const refreshNotifications = useCallback(async () => {
    if (!userId || !hasValidSession()) return;

    // Check if refresh is rate limited
    const now = Date.now();
    if ((now - lastRefreshTime.current) < MIN_REFRESH_INTERVAL) {
      console.log('Refresh blocked - rate limited');
      return;
    }

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
  }, [userId, hasValidSession(), fetchNotificationData, processNotificationData]);

  // Optimized notification actions using authenticated API
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId || !hasValidSession()) return false;

    try {
      const result = await callRpc('mark_notification_read', {
        p_notification_id: notificationId
      }, { showErrorToast: false });

      if (result) {
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
  }, [userId, hasValidSession, callRpc, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!userId || !hasValidSession()) return false;

    try {
      const updatedCount = await callRpc('mark_all_notifications_read', {}, { showErrorToast: false });

      if (updatedCount && updatedCount > 0) {
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
  }, [userId, hasValidSession, callRpc, toast]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!userId || !hasValidSession()) return false;

    try {
      const result = await callRpc('delete_notification', {
        p_notification_id: notificationId
      }, { showErrorToast: false });

      if (result) {
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
  }, [userId, hasValidSession, callRpc, notifications, toast]);

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
    if (userId && hasValidSession() && !initialized && !initializationAttempted.current) {
      initializeNotifications();
    } else if (!userId || !hasValidSession()) {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setStatus(null);
      setPreferences(null);
      setError(null);
      setLoading(false);
      setInitialized(false);
      initializationAttempted.current = false;
      
      // Clean up subscription when user logs out
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        } catch (error) {
          console.error('Error removing subscription on logout:', error);
        }
      }
    }
  }, [userId, hasValidSession(), initialized, initializeNotifications]);

  // Set up real-time subscription with enhanced throttling and rate limiting
  useEffect(() => {
    // Only set up subscription if we have a user, valid session, and are initialized
    if (!userId || !hasValidSession() || !initialized) {
      console.log('Skipping subscription setup - not ready', { userId, hasValidSession: hasValidSession(), initialized });
      return;
    }

    // Prevent multiple concurrent subscription setups
    if (subscriptionSetupInProgress.current) {
      console.log('Subscription setup already in progress, skipping');
      return;
    }

    // Rate limit subscription setup - don't set up too frequently
    const now = Date.now();
    if (lastUpdateTime.current && (now - lastUpdateTime.current) < 10000) { // 10 second minimum between setups
      console.log('Subscription setup rate limited');
      return;
    }

    // Clean up existing subscription if it exists
    if (subscriptionRef.current) {
      console.log('Cleaning up existing subscription');
      try {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      } catch (error) {
        console.error('Error removing existing subscription:', error);
      }
    }

    console.log('Setting up notification subscription for user:', userId);
    subscriptionSetupInProgress.current = true;
    lastUpdateTime.current = now;

    try {
      subscriptionRef.current = supabase
        .channel(`notifications_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const now = Date.now();
          
          // Enhanced throttling to prevent excessive re-renders and API calls
          if (now - lastUpdateTime.current < UPDATE_THROTTLE) {
            console.log('Throttling notification update - too frequent');
            return;
          }
          
          // Additional check to prevent processing duplicate events
          if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
            const hasActualChange = JSON.stringify(payload.old) !== JSON.stringify(payload.new);
            if (!hasActualChange) {
              console.log('Ignoring duplicate update event');
              return;
            }
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
          
          // Only mark setup as complete when we get a definitive status
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
            subscriptionSetupInProgress.current = false;
          }
        });
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      subscriptionSetupInProgress.current = false;
    }

    // Clean up subscription on unmount or when dependencies change
    return () => {
      console.log('Cleaning up notification subscription');
      subscriptionSetupInProgress.current = false;
      
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        } catch (error) {
          console.error('Error removing subscription on cleanup:', error);
        }
      }
    };
  }, [userId, hasValidSession(), initialized, toast]); // Only re-run when these core dependencies change

  // Create throttled version of refresh to prevent abuse
  const throttledRefresh = useCallback(
    throttle(refreshNotifications, MIN_REFRESH_INTERVAL),
    [refreshNotifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    initialized,
    status,
    preferences,
    error,
    refreshNotifications: throttledRefresh, // Use throttled version
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationActions
  };
};