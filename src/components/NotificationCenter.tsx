import React from 'react';
import { Bell, X, AlertTriangle, Info, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, KPLCNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type: KPLCNotification['type']) => {
  switch (type) {
    case 'token_depleted':
    case 'token_low':
      return <Zap className="h-5 w-5" />;
    case 'power_restored':
      return <Zap className="h-5 w-5 text-green-500" />;
    case 'maintenance':
      return <AlertTriangle className="h-5 w-5" />;
    case 'bill_reminder':
      return <Clock className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getSeverityColor = (severity: KPLCNotification['severity']) => {
  switch (severity) {
    case 'critical':
      return 'text-red-500 border-red-500/20 bg-red-500/10';
    case 'high':
      return 'text-orange-500 border-orange-500/20 bg-orange-500/10';
    case 'medium':
      return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
    case 'low':
      return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
    default:
      return 'text-gray-500 border-gray-500/20 bg-gray-500/10';
  }
};

const NotificationItem: React.FC<{
  notification: KPLCNotification;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, onMarkAsRead }) => {
  const severityColor = getSeverityColor(notification.severity);
  
  return (
    <Card className={`mb-3 ${severityColor} ${!notification.isRead ? 'ring-2 ring-aurora-green/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="mt-1">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm truncate">{notification.title}</h4>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-aurora-green rounded-full ml-2 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
              
              {/* Token balance info */}
              {notification.tokenBalance !== undefined && (
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>Balance: KSh {notification.tokenBalance.toFixed(2)}</span>
                  {notification.estimatedDays !== undefined && (
                    <span>~{notification.estimatedDays} days remaining</span>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
                <Badge variant="outline" className="text-xs">
                  {notification.severity}
                </Badge>
              </div>
            </div>
          </div>
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">KPLC Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="p-4 pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aurora-green"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;