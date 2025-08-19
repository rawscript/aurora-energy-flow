import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  // Refs to prevent multiple subscriptions and fetches
  const subscriptionRef = useRef<any>(null);
  const fetchingRef = useRef(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds minimum between fetches

  // Check notification status first (safe check)
  const checkNotificationStatus = useCallback(async () => {
    if (!user || !session) {
      setStatus(null);
      return null;
    }

    try {
      console.log('Checking notification status for user:', user.id);

      const { data, error } = await supabase
        .rpc('check_notifications_status', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error checking notification status:', error);
        // Return default status instead of throwing
        const defaultStatus: NotificationStatus = {
          has_notifications: false,
          total_count: 0,
          unread_count: 0,
          notification_types: [],
          notifications_table_exists: false,
          ai_alerts_table_exists: false,
          status: 'empty'
        };
        setStatus(defaultStatus);
        return defaultStatus;
      }

      const statusData: NotificationStatus = {
        has_notifications: data.has_notifications || false,
        total_count: data.total_count || 0,
        unread_count: data.unread_count || 0,
        last_notification_date: data.last_notification_date,
        notification_types: data.notification_types || [],
        notifications_table_exists: data.notifications_table_exists || false,
        ai_alerts_table_exists: data.ai_alerts_table_exists || false,
        status: data.status || 'empty'
      };

      setStatus(statusData);
      setUnreadCount(statusData.unread_count);
      
      console.log('Notification status:', statusData);
      return statusData;
    } catch (error) {
      console.error('Exception checking notification status:', error);
      const defaultStatus: NotificationStatus = {
        has_notifications: false,
        total_count: 0,
        unread_count: 0,
        notification_types: [],
        notifications_table_exists: false,
        ai_alerts_table_exists: false,
        status: 'empty'
      };
      setStatus(defaultStatus);
      return defaultStatus;
    }
  }, [user, session]);

  // Get notification preferences
  const getNotificationPreferences = useCallback(async () => {
    if (!user || !session) {
      setPreferences(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_notification_preferences', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error getting notification preferences:', error);
        return null;
      }

      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Exception getting notification preferences:', error);
      return null;
    }
  }, [user, session]);

  // Check and fetch notifications safely
  const checkAndFetchNotifications = useCallback(async (force = false) => {
    if (!user || !session) {
      setNotifications([]);
      setUnreadCount(0);
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Prevent rapid successive calls
    const now = Date.now();
    if (!force && fetchingRef.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }

    if (!force && (now - lastFetchTime.current) < FETCH_COOLDOWN) {
      console.log('Fetch cooldown active, skipping');
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchTime.current = now;
      setError(null);
      
      if (!initialized) {
        setLoading(true);
      }

      // First, check the status to see if we have any notifications
      const currentStatus = await checkNotificationStatus();
      
      if (!currentStatus) {
        setLoading(false);
        setError('Unable to check notification status');
        return;
      }

      // If no notifications exist, don't try to fetch them
      if (!currentStatus.has_notifications) {
        console.log('No notifications found for user');
        setNotifications([]);
        setUnreadCount(0);
        
        // Check if user needs initialization (new user)
        try {
          const { data: needsInit } = await supabase
            .rpc('check_user_notification_initialization', {
              p_user_id: user.id
            });

          if (needsInit) {
            console.log('Initializing notifications for new user');
            await supabase.rpc('initialize_user_notifications', {
              p_user_id: user.id
            });
            
            // Recheck status after initialization
            setTimeout(() => checkNotificationStatus(), 1000);
          }
        } catch (initError) {
          console.error('Error checking/initializing user notifications:', initError);
        }
        
        if (!initialized) {
          setInitialized(true);
        }
        setLoading(false);
        return;
      }

      console.log('Fetching notifications using safe function for user:', user.id);

      // Use the safe function to get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .rpc('get_user_notifications_safe', {
          p_user_id: user.id,
          p_limit: 50,
          p_unread_only: false
        });

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        setError('Failed to load notifications');
        
        // Don't throw error, just set empty state
        setNotifications([]);
        setUnreadCount(0);
        
        if (!initialized) {
          setInitialized(true);
        }
        setLoading(false);
        return;
      }

      // Transform the data
      const transformedNotifications: Notification[] = (notificationsData || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        severity: notification.severity,
        isRead: notification.is_read,
        tokenBalance: notification.token_balance,
        estimatedDays: notification.estimated_days,
        metadata: notification.metadata,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at,
        expiresAt: notification.expires_at,
        sourceTable: notification.source_table
      }));

      // Update state only if data has changed
      setNotifications(prevNotifications => {
        const hasChanged = JSON.stringify(prevNotifications) !== JSON.stringify(transformedNotifications);
        if (hasChanged) {
          console.log(`Notifications updated: ${transformedNotifications.length} notifications`);
        }
        return hasChanged ? transformedNotifications : prevNotifications;
      });

      const newUnreadCount = transformedNotifications.filter(n => !n.isRead).length;
      setUnreadCount(prevCount => {
        if (prevCount !== newUnreadCount) {
          console.log(`Unread count updated: ${newUnreadCount}`);
        }
        return newUnreadCount;
      });

      if (!initialized) {
        setInitialized(true);
      }

    } catch (error) {
      console.error('Error in checkAndFetchNotifications:', error);
      setError('Failed to load notifications');
      
      // Don't show error toast for every failure, just set error state
      if (!initialized) {
        setInitialized(true);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, session, initialized, checkNotificationStatus]);

  // Mark notification as read using database function
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user || !session) return false;

    try {
      console.log('Marking notification as read:', notificationId);

      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          p_user_id: user.id,
          p_notification_id: notificationId
        });

      if (error) {
        throw error;
      }

      if (data) {
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true, updatedAt: new Date().toISOString() }
              : notification
          )
        );
        
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Could not mark notification as read.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, session, toast]);

  // Mark all notifications as read using database function
  const markAllAsRead = useCallback(async () => {
    if (!user || !session) return false;

    try {
      console.log('Marking all notifications as read');

      const { data, error } = await supabase
        .rpc('mark_all_notifications_read', {
          p_user_id: user.id
        });

      if (error) {
        throw error;
      }

      const updatedCount = data || 0;

      if (updatedCount > 0) {
        // Update local state immediately
        const now = new Date().toISOString();
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            isRead: true, 
            updatedAt: now 
          }))
        );
        
        setUnreadCount(0);

        toast({
          title: 'All notifications marked as read',
          description: `${updatedCount} notifications marked as read.`,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Could not mark all notifications as read.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, session, toast]);

  // Delete notification using database function
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user || !session) return false;

    try {
      console.log('Deleting notification:', notificationId);

      const { data, error } = await supabase
        .rpc('delete_notification', {
          p_user_id: user.id,
          p_notification_id: notificationId
        });

      if (error) {
        throw error;
      }

      if (data) {
        // Update local state immediately
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
        
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }

        toast({
          title: 'Notification deleted',
          description: 'The notification has been removed.',
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Could not delete notification.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, session, toast, notifications]);

  // Delete all read notifications using database function
  const deleteAllRead = useCallback(async () => {
    if (!user || !session) return false;

    try {
      console.log('Deleting all read notifications');

      const { data, error } = await supabase
        .rpc('delete_read_notifications', {
          p_user_id: user.id
        });

      if (error) {
        throw error;
      }

      const deletedCount = data || 0;

      if (deletedCount > 0) {
        // Update local state immediately
        setNotifications(prev => prev.filter(notification => !notification.isRead));

        toast({
          title: 'Read notifications deleted',
          description: `${deletedCount} read notifications have been removed.`,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast({
        title: 'Error',
        description: 'Could not delete read notifications.',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, session, toast]);

  // Create a new notification using database function
  const createNotification = useCallback(async (notification: {
    title: string;
    message: string;
    type?: string;
    severity?: string;
    tokenBalance?: number;
    estimatedDays?: number;
    metadata?: any;
    expiresAt?: string;
  }) => {
    if (!user || !session) return false;

    try {
      console.log('Creating notification:', notification.title);

      const { data, error } = await supabase
        .rpc('create_notification', {
          p_user_id: user.id,
          p_title: notification.title,
          p_message: notification.message,
          p_type: notification.type || 'info',
          p_severity: notification.severity || 'low',
          p_token_balance: notification.tokenBalance,
          p_estimated_days: notification.estimatedDays,
          p_metadata: notification.metadata,
          p_expires_at: notification.expiresAt
        });

      if (error) {
        throw error;
      }

      if (data) {
        // The real-time subscription will handle adding the notification to state
        console.log('Notification created with ID:', data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }, [user, session]);

  // Get quick actions for a notification
  const getNotificationActions = useCallback((notification: Notification): NotificationAction[] => {
    const actions: NotificationAction[] = [];

    // Mark as read/unread action
    if (!notification.isRead) {
      actions.push({
        id: 'mark-read',
        label: 'Mark as Read',
        action: () => markAsRead(notification.id),
        variant: 'outline'
      });
    }

    // Token-specific actions
    if (notification.type === 'token_low' || notification.type === 'token_depleted') {
      actions.push({
        id: 'buy-tokens',
        label: 'Buy Tokens',
        action: () => {
          window.location.hash = '#tokens';
        },
        variant: 'default'
      });
    }

    // Token purchase actions
    if (notification.type === 'token_purchase' && notification.metadata?.token_code) {
      actions.push({
        id: 'copy-code',
        label: 'Copy Token Code',
        action: () => {
          navigator.clipboard.writeText(notification.metadata.token_code);
          toast({
            title: 'Token code copied',
            description: 'Token code has been copied to clipboard.',
          });
        },
        variant: 'outline'
      });
    }

    // Setup actions
    if (notification.type === 'setup_required') {
      actions.push({
        id: 'setup-meter',
        label: 'Setup Meter',
        action: () => {
          window.location.hash = '#settings';
        },
        variant: 'default'
      });
    }

    // High usage actions
    if (notification.type === 'high_usage' || notification.type === 'efficiency_alert') {
      actions.push({
        id: 'view-insights',
        label: 'View Insights',
        action: () => {
          window.location.hash = '#insights';
        },
        variant: 'outline'
      });
    }

    // Delete action (always available)
    actions.push({
      id: 'delete',
      label: 'Delete',
      action: () => deleteNotification(notification.id),
      variant: 'destructive'
    });

    return actions;
  }, [markAsRead, deleteNotification, toast]);

  // Initialize notifications when user changes
  useEffect(() => {
    if (user && session && !initialized) {
      console.log('Initializing notifications for user:', user.id);
      
      // Get preferences first, then check notifications
      getNotificationPreferences().then(() => {
        checkAndFetchNotifications(true);
      });
    } else if (!user) {
      // Reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setStatus(null);
      setPreferences(null);
      setError(null);
      setLoading(false);
      setInitialized(false);
      lastFetchTime.current = 0;
    }
  }, [user, session, initialized, checkAndFetchNotifications, getNotificationPreferences]);

  // Set up real-time subscription (only once per user)
  useEffect(() => {
    if (!user || !session || !initialized) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('Cleaning up existing notification subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    console.log('Setting up real-time notification subscription for user:', user.id);

    // Subscribe to notifications changes
    subscriptionRef.current = supabase
      .channel(`notifications_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Notification change received:', payload.eventType, payload.new?.title);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new notification to state
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
            // Check if notification already exists
            if (prev.some(n => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });

          if (!newNotification.isRead) {
            setUnreadCount(prev => prev + 1);
          }

          // Show toast for new notifications (except welcome messages)
          if (!newNotification.isRead && newNotification.type !== 'welcome') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Update existing notification
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === payload.new.id 
                ? {
                    ...notification,
                    isRead: payload.new.is_read,
                    updatedAt: payload.new.updated_at
                  }
                : notification
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove deleted notification
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          if (!payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      })
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up notification subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, session, initialized, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    initialized,
    status,
    preferences,
    error,
    checkAndFetchNotifications,
    checkNotificationStatus,
    getNotificationPreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    createNotification,
    getNotificationActions
  };
};