import React, { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  initialized: boolean;
  status: any;
  preferences: any;
  error: string | null;
  checkAndFetchNotifications: () => Promise<void>;
  checkNotificationStatus: () => Promise<any>;
  getNotificationPreferences: () => Promise<any>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  deleteAllRead: () => Promise<boolean>;
  createNotification: (notification: any) => Promise<boolean>;
  getNotificationActions: (notification: any) => any[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
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
  } = useNotifications();

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
    