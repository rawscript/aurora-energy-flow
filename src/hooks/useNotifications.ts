import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface KPLCNotification {
    id: string;
    type: 'token_low' | 'token_depleted' | 'power_restored' | 'maintenance' | 'bill_reminder';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRead: boolean;
    createdAt: string;
    tokenBalance?: number;
    estimatedDays?: number;
}

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<KPLCNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    // Check token balance and create notifications
    const checkTokenBalance = async () => {
        if (!user) return;

        try {
            // Get latest energy reading to estimate token balance
            const { data: latestReading } = await supabase
                .from('energy_readings')
                .select('*')
                .eq('user_id', user.id)
                .order('reading_date', { ascending: false })
                .limit(1)
                .single();

            if (latestReading) {
                // Simulate token balance calculation (in real app, this would come from KPLC API)
                const dailyUsage = latestReading.kwh_consumed;
                const costPerKwh = latestReading.cost_per_kwh;
                const estimatedTokenBalance = Math.max(0, 500 - (dailyUsage * costPerKwh * 7)); // Simulate weekly consumption
                const estimatedDays = estimatedTokenBalance / (dailyUsage * costPerKwh);

                // Create notifications based on token balance
                if (estimatedTokenBalance <= 0) {
                    await createNotification({
                        type: 'token_depleted',
                        title: 'KPLC Tokens Depleted',
                        message: 'Your electricity tokens have been depleted. Please purchase new tokens immediately to avoid power disconnection.',
                        severity: 'critical',
                        tokenBalance: estimatedTokenBalance,
                        estimatedDays: 0
                    });
                } else if (estimatedTokenBalance <= 100) {
                    await createNotification({
                        type: 'token_low',
                        title: 'Low KPLC Token Balance',
                        message: `Your token balance is running low (KSh ${estimatedTokenBalance.toFixed(2)}). Consider purchasing more tokens soon.`,
                        severity: 'high',
                        tokenBalance: estimatedTokenBalance,
                        estimatedDays: Math.floor(estimatedDays)
                    });
                } else if (estimatedDays <= 3) {
                    await createNotification({
                        type: 'token_low',
                        title: 'Token Balance Warning',
                        message: `Your current token balance will last approximately ${Math.floor(estimatedDays)} days based on your usage pattern.`,
                        severity: 'medium',
                        tokenBalance: estimatedTokenBalance,
                        estimatedDays: Math.floor(estimatedDays)
                    });
                }
            }
        } catch (error) {
            console.error('Error checking token balance:', error);
        }
    };

    const createNotification = async (notification: Omit<KPLCNotification, 'id' | 'isRead' | 'createdAt'>) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('ai_alerts')
                .insert({
                    user_id: user.id,
                    alert_type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    severity: notification.severity,
                    recommended_actions: {
                        tokenBalance: notification.tokenBalance,
                        estimatedDays: notification.estimatedDays
                    }
                });

            if (error) throw error;

            // Show toast notification
            toast({
                title: notification.title,
                description: notification.message,
                variant: notification.severity === 'critical' ? 'destructive' : 'default',
            });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    };

    const fetchNotifications = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('ai_alerts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const formattedNotifications: KPLCNotification[] = (data || []).map(alert => {
                const recommendedActions = alert.recommended_actions as { tokenBalance?: number; estimatedDays?: number } | null;
                return {
                    id: alert.id,
                    type: alert.alert_type as KPLCNotification['type'],
                    title: alert.title,
                    message: alert.message,
                    severity: alert.severity as KPLCNotification['severity'],
                    isRead: alert.is_read,
                    createdAt: alert.created_at,
                    tokenBalance: recommendedActions?.tokenBalance,
                    estimatedDays: recommendedActions?.estimatedDays
                };
            });

            setNotifications(formattedNotifications);
            setUnreadCount(formattedNotifications.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('ai_alerts')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('ai_alerts')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchNotifications();
        checkTokenBalance();

        // Set up real-time listener for new notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_alerts',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        // Check token balance every 30 minutes
        const tokenCheckInterval = setInterval(checkTokenBalance, 30 * 60 * 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(tokenCheckInterval);
        };
    }, [user]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        checkTokenBalance,
        refreshNotifications: fetchNotifications
    };
};