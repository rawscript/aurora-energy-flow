import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  Zap,
  CreditCard,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const NotificationCenter = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const isMobile = useIsMobile();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'token_low':
      case 'token_depleted':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'token_purchase':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'power_restored':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'bill_reminder':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/10';
      case 'high':
        return 'border-orange-500 bg-orange-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bell className="h-6 w-6 text-aurora-green-light" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
                  Notifications
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notifications
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardContent className="p-0">
          <ScrollArea className={`${isMobile ? 'h-96' : 'h-[600px]'} w-full`}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No notifications yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  You'll see energy alerts and updates here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-800/30 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-slate-800/20' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getSeverityColor(notification.severity)}`}
                            >
                              {notification.severity}
                            </Badge>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-aurora-green-light rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm ${
                          !notification.isRead ? 'text-gray-300' : 'text-gray-400'
                        } mb-2`}>
                          {notification.message}
                        </p>
                        
                        {/* Additional info for token notifications */}
                        {(notification.tokenBalance !== undefined || notification.estimatedDays !== undefined) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {notification.tokenBalance !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                Balance: KSh {notification.tokenBalance.toFixed(2)}
                              </Badge>
                            )}
                            {notification.estimatedDays !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.estimatedDays} days remaining
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          
                          {!notification.isRead && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;