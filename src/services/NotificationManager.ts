import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

export interface Notification {
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

export interface NotificationStatus {
  has_notifications: boolean;
  total_count: number;
  unread_count: number;
  last_notification_date?: string;
  notification_types: string[];
  status: 'empty' | 'all_read' | 'has_unread';
}

export interface NotificationPreferences {
  preferences: Record<string, any>;
  has_meter: boolean;
  meter_category?: string;
  contact_methods: Record<string, boolean>;
  setup_status: Record<string, boolean>;
}

type NotificationListener = (notifications: Notification[]) => void;
type StatusListener = (status: NotificationStatus) => void;
type PreferencesListener = (preferences: NotificationPreferences | null) => void;

/**
 * Singleton NotificationManager - Efficient real-time notification system
 * 
 * Key Features:
 * - Single source of truth for all notifications
 * - Minimal backend calls (only on initialization and user actions)
 * - Real-time updates via Supabase subscriptions
 * - Automatic state management across components
 * - Built-in caching and rate limiting
 */
export class NotificationManager {
  private static instance: NotificationManager | null = null;
  
  // Core state
  private notifications: Notification[] = [];
  private status: NotificationStatus | null = null;
  private preferences: NotificationPreferences | null = null;
  private initialized = false;
  private loading = false;
  private error: string | null = null;
  
  // User management
  private currentUserId: string | null = null;
  private subscription: any = null;
  
  // Listeners for reactive updates
  private notificationListeners = new Set<NotificationListener>();
  private statusListeners = new Set<StatusListener>();
  private preferencesListeners = new Set<PreferencesListener>();
  private loadingListeners = new Set<(loading: boolean) => void>();
  private errorListeners = new Set<(error: string | null) => void>();
  
  // Rate limiting and caching
  private lastInitTime = 0;
  private lastRefreshTime = 0;
  private initializationPromise: Promise<void> | null = null;
  
  // Constants
  private readonly MIN_INIT_INTERVAL = 60000; // 1 minute between initializations
  private readonly MIN_REFRESH_INTERVAL = 30000; // 30 seconds between refreshes
  private readonly MAX_NOTIFICATIONS = 50;
  private readonly CACHE_DURATION = 300000; // 5 minutes cache for preferences
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }
  
  // ============ PUBLIC API ============
  
  /**
   * Initialize notifications for a user (called once per user session)
   */
  async initialize(userId: string): Promise<void> {
    if (this.currentUserId === userId && this.initialized) {
      console.log('Already initialized for user:', userId);
      return;
    }
    
    // Rate limiting for initialization
    const now = Date.now();
    if (this.lastInitTime && (now - this.lastInitTime) < this.MIN_INIT_INTERVAL) {
      console.log('Initialization rate limited');
      return;
    }
    
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization(userId);
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
  
  /**
   * Subscribe to notification updates
   */
  subscribe(
    onNotifications?: NotificationListener,
    onStatus?: StatusListener,
    onPreferences?: PreferencesListener,
    onLoading?: (loading: boolean) => void,
    onError?: (error: string | null) => void
  ) {
    if (onNotifications) this.notificationListeners.add(onNotifications);
    if (onStatus) this.statusListeners.add(onStatus);
    if (onPreferences) this.preferencesListeners.add(onPreferences);
    if (onLoading) this.loadingListeners.add(onLoading);
    if (onError) this.errorListeners.add(onError);
    
    // Immediately call with current state
    if (onNotifications) onNotifications(this.notifications);
    if (onStatus && this.status) onStatus(this.status);
    if (onPreferences) onPreferences(this.preferences);
    if (onLoading) onLoading(this.loading);
    if (onError) onError(this.error);
    
    // Return unsubscribe function
    return () => {
      if (onNotifications) this.notificationListeners.delete(onNotifications);
      if (onStatus) this.statusListeners.delete(onStatus);
      if (onPreferences) this.preferencesListeners.delete(onPreferences);
      if (onLoading) this.loadingListeners.delete(onLoading);
      if (onError) this.errorListeners.delete(onError);
    };
  }
  
  /**
   * Mark notification as read (optimistic update + backend sync)
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.currentUserId) return false;
    
    // Optimistic update
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification || notification.isRead) return true;
    
    this._updateNotification(notificationId, { isRead: true, updatedAt: new Date().toISOString() });
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', this.currentUserId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
        // Revert optimistic update
        this._updateNotification(notificationId, { isRead: false });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception marking notification as read:', error);
      // Revert optimistic update
      this._updateNotification(notificationId, { isRead: false });
      return false;
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    if (!this.currentUserId) return false;
    
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return true;
    
    // Optimistic update
    const now = new Date().toISOString();
    unreadNotifications.forEach(n => {
      this._updateNotification(n.id, { isRead: true, updatedAt: now });
    });
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: now })
        .eq('user_id', this.currentUserId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error marking all notifications as read:', error);
        // Revert optimistic updates
        unreadNotifications.forEach(n => {
          this._updateNotification(n.id, { isRead: false });
        });
        return false;
      }
      
      toast.success(`${unreadNotifications.length} notifications marked as read`);
      return true;
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
      // Revert optimistic updates
      unreadNotifications.forEach(n => {
        this._updateNotification(n.id, { isRead: false });
      });
      return false;
    }
  }
  
  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    if (!this.currentUserId) return false;
    
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return true;
    
    // Optimistic update
    this._removeNotification(notificationId);
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', this.currentUserId);
      
      if (error) {
        console.error('Error deleting notification:', error);
        // Revert optimistic update
        this._addNotification(notification);
        return false;
      }
      
      toast.success('Notification deleted');
      return true;
    } catch (error) {
      console.error('Exception deleting notification:', error);
      // Revert optimistic update
      this._addNotification(notification);
      return false;
    }
  }
  
  /**
   * Refresh notifications (rate limited)
   */
  async refresh(): Promise<void> {
    if (!this.currentUserId) return;
    
    const now = Date.now();
    if (this.lastRefreshTime && (now - this.lastRefreshTime) < this.MIN_REFRESH_INTERVAL) {
      console.log('Refresh rate limited');
      return;
    }
    
    this.lastRefreshTime = now;
    await this._fetchNotifications();
  }
  
  /**
   * Get current state (for immediate access)
   */
  getState() {
    return {
      notifications: this.notifications,
      status: this.status,
      preferences: this.preferences,
      initialized: this.initialized,
      loading: this.loading,
      error: this.error,
      unreadCount: this.notifications.filter(n => !n.isRead).length
    };
  }
  
  /**
   * Clean up when user logs out
   */
  cleanup(): void {
    console.log('Cleaning up NotificationManager');
    
    // Clean up subscription
    if (this.subscription) {
      try {
        supabase.removeChannel(this.subscription);
      } catch (error) {
        console.error('Error removing subscription:', error);
      }
      this.subscription = null;
    }
    
    // Reset state
    this.notifications = [];
    this.status = null;
    this.preferences = null;
    this.initialized = false;
    this.loading = false;
    this.error = null;
    this.currentUserId = null;
    this.lastInitTime = 0;
    this.lastRefreshTime = 0;
    
    // Notify all listeners
    this._notifyListeners();
  }
  
  // ============ PRIVATE METHODS ============
  
  private async _performInitialization(userId: string): Promise<void> {
    console.log('Initializing NotificationManager for user:', userId);
    
    // Clean up previous user's data
    if (this.currentUserId !== userId) {
      this.cleanup();
    }
    
    this.currentUserId = userId;
    this.lastInitTime = Date.now();
    this._setLoading(true);
    this._setError(null);
    
    try {
      // Fetch initial data
      await Promise.all([
        this._fetchNotifications(),
        this._fetchPreferences()
      ]);
      
      // Set up real-time subscription
      this._setupSubscription();
      
      this.initialized = true;
      console.log('NotificationManager initialized successfully');
    } catch (error) {
      console.error('Error initializing NotificationManager:', error);
      this._setError('Failed to initialize notifications');
    } finally {
      this._setLoading(false);
    }
  }
  
  private async _fetchNotifications(): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(this.MAX_NOTIFICATIONS);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }
      
      const notifications: Notification[] = (data || []).map(n => ({
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
        sourceTable: 'notifications'
      }));
      
      this.notifications = notifications;
      this._updateStatus();
      this._notifyListeners();
      
      console.log(`Fetched ${notifications.length} notifications`);
    } catch (error) {
      console.error('Exception fetching notifications:', error);
    }
  }
  
  private async _fetchPreferences(): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences, meter_category, notifications_enabled')
        .eq('id', this.currentUserId)
        .single();
      
      if (error) {
        console.error('Error fetching preferences:', error);
        return;
      }
      
      if (data) {
        this.preferences = {
          preferences: {
            token_low: data.notification_preferences?.token_low ?? true,
            token_depleted: data.notification_preferences?.token_depleted ?? true,
            power_restored: data.notification_preferences?.power_restored ?? true,
            energy_alert: data.notification_preferences?.energy_alert ?? true,
            low_balance_alert: data.notification_preferences?.low_balance_alert ?? true
          },
          has_meter: Boolean(data.meter_category),
          meter_category: data.meter_category || 'residential',
          contact_methods: {
            email: true,
            push: true,
            sms: false
          },
          setup_status: {
            meter_setup: Boolean(data.meter_category),
            notifications_enabled: data.notifications_enabled !== false
          }
        };
        
        this._notifyListeners();
      }
    } catch (error) {
      console.error('Exception fetching preferences:', error);
    }
  }
  
  private _setupSubscription(): void {
    if (!this.currentUserId || this.subscription) return;
    
    console.log('Setting up real-time subscription for user:', this.currentUserId);
    
    this.subscription = supabase
      .channel(`notifications_${this.currentUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${this.currentUserId}`
      }, (payload) => {
        this._handleRealtimeUpdate(payload);
      })
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });
  }
  
  private _handleRealtimeUpdate(payload: any): void {
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
        
        this._addNotification(newNotification);
        
        // Show toast for important notifications
        if (!newNotification.isRead && newNotification.type !== 'welcome' && newNotification.severity !== 'low') {
          toast.success(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          });
        }
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        this._updateNotification(payload.new.id, {
          isRead: payload.new.is_read,
          updatedAt: payload.new.updated_at
        });
      } else if (payload.eventType === 'DELETE' && payload.old) {
        this._removeNotification(payload.old.id);
      }
    } catch (error) {
      console.error('Error processing real-time update:', error);
    }
  }
  
  private _addNotification(notification: Notification): void {
    // Avoid duplicates
    if (this.notifications.some(n => n.id === notification.id)) return;
    
    this.notifications = [notification, ...this.notifications.slice(0, this.MAX_NOTIFICATIONS - 1)];
    this._updateStatus();
    this._notifyListeners();
  }
  
  private _updateNotification(id: string, updates: Partial<Notification>): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    this.notifications[index] = { ...this.notifications[index], ...updates };
    this._updateStatus();
    this._notifyListeners();
  }
  
  private _removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this._updateStatus();
    this._notifyListeners();
  }
  
  private _updateStatus(): void {
    const unreadCount = this.notifications.filter(n => !n.isRead).length;
    
    this.status = {
      has_notifications: this.notifications.length > 0,
      total_count: this.notifications.length,
      unread_count: unreadCount,
      last_notification_date: this.notifications[0]?.createdAt,
      notification_types: [...new Set(this.notifications.map(n => n.type))],
      status: this.notifications.length === 0 ? 'empty' : 
              (unreadCount > 0 ? 'has_unread' : 'all_read')
    };
  }
  
  private _setLoading(loading: boolean): void {
    this.loading = loading;
    this.loadingListeners.forEach(listener => listener(loading));
  }
  
  private _setError(error: string | null): void {
    this.error = error;
    this.errorListeners.forEach(listener => listener(error));
  }
  
  private _notifyListeners(): void {
    this.notificationListeners.forEach(listener => listener(this.notifications));
    if (this.status) {
      this.statusListeners.forEach(listener => listener(this.status!));
    }
    this.preferencesListeners.forEach(listener => listener(this.preferences));
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();