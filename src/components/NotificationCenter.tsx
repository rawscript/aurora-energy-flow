import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Calendar,
  Settings,
  Trash2,
  Copy,
  Eye,
  MoreHorizontal,
  RefreshCw,
  X,
  BellOff,
  Smartphone,
  Mail,
  MessageSquare,
  Power,
  Sun
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useEnergyProvider } from '@/contexts/EnergyProviderContext';

const NotificationCenter = () => {
  const { 
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
  } = useNotifications();
  
  const { provider, providerConfig } = useEnergyProvider();
  const isMobile = useIsMobile();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'all-read' | null>(null);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'token_low':
      case 'token_depleted':
        return providerConfig.type === 'solar' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Zap className="h-5 w-5 text-yellow-500" />;
      case 'token_purchase':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'power_restored':
        return <Power className="h-5 w-5 text-blue-500" />;
      case 'maintenance':
        return <Settings className="h-5 w-5 text-orange-500" />;
      case 'bill_reminder':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'high_usage':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'efficiency_alert':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'welcome':
        return <BellRing className="h-5 w-5 text-aurora-green" />;
      case 'setup_required':
        return <Settings className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/10 text-red-400';
      case 'high':
        return 'border-orange-500 bg-orange-500/10 text-orange-400';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'low':
        return 'border-blue-500 bg-blue-500/10 text-blue-400';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getNotificationBorderColor = (type: string, isRead: boolean) => {
    if (isRead) return 'border-slate-700/50';
    
    switch (type) {
      case 'token_low':
      case 'token_depleted':
        return providerConfig.type === 'solar' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-500/30 bg-yellow-500/5';
      case 'token_purchase':
        return 'border-green-500/30 bg-green-500/5';
      case 'high_usage':
        return 'border-red-500/30 bg-red-500/5';
      case 'efficiency_alert':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'welcome':
        return 'border-aurora-green/30 bg-aurora-green/5';
      case 'setup_required':
        return 'border-orange-500/30 bg-orange-500/5';
      default:
        return 'border-aurora-green/30 bg-aurora-green/5';
    }
  };

  const handleQuickAction = (action: any) => {
    action.action();
    setSelectedNotification(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget === 'single' && selectedNotification) {
      await deleteNotification(selectedNotification.id);
    } else if (deleteTarget === 'all-read') {
      // Implement delete all read functionality
      const readNotifications = notifications.filter(n => n.isRead);
      for (const notification of readNotifications) {
        await deleteNotification(notification.id);
      }
    }
    setShowDeleteDialog(false);
    setDeleteTarget(null);
    setSelectedNotification(null);
  };

  const handleRefresh = () => {
    refreshNotifications();
  };

  // Show loading state only during initial load
  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-aurora-green-light"></div>
      </div>
    );
  }

  // Show error state if there's an error and no data
  if (error && notifications.length === 0 && initialized) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <Card className="bg-aurora-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-red-400">Error Loading Notifications</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  We encountered an issue while loading your notifications. This might be temporary.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Please try again or check your connection.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleRefresh}
                    className="bg-aurora-green hover:bg-aurora-green/80"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => {
                      // Dispatch a custom event to navigate to settings
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Check Settings
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readNotifications = notifications.filter(n => n.isRead);
  const hasReadNotifications = readNotifications.length > 0;
  const isEmptyState = status?.status === 'empty' || notifications.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="bg-aurora-card border-aurora-green/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {isEmptyState ? (
                  <BellOff className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <>
                    <Bell className="h-6 w-6 text-aurora-green-light" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl text-aurora-green-light">
                  {providerConfig.name} Notifications
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isEmptyState ? 'No notifications yet' : `${unreadCount} unread • ${notifications.length} total`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="text-xs border-aurora-green/30 hover:bg-aurora-green/10"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
              
              {hasReadNotifications && (
                <Button
                  onClick={() => {
                    setDeleteTarget('all-read');
                    setShowDeleteDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs border-red-500/30 hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List or Empty State */}
      <Card className="bg-aurora-card border-aurora-blue/20">
        <CardContent className="p-0">
          <ScrollArea className={`${isMobile ? 'h-96' : 'h-[600px]'} w-full`}>
            {isEmptyState ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BellOff className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No Notifications Yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  You haven't received any notifications yet. Once you set up your {providerConfig.terminology.device} and start using the {providerConfig.name} system, 
                  you'll receive energy alerts, {providerConfig.terminology.credits} notifications, and helpful insights here.
                </p>
                
                {/* Setup encouragement */}
                <div className="bg-slate-800/30 rounded-lg p-4 max-w-md">
                  <h4 className="text-sm font-medium mb-3 text-aurora-green-light">Get Started with {providerConfig.name} Notifications</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-orange-500" />
                      <span>Set up your {providerConfig.terminology.device} to receive {providerConfig.terminology.credits} alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {providerConfig.type === 'solar' ? (
                        <Sun className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Zap className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>Get low balance warnings and usage insights</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      <span>Receive {providerConfig.terminology.credits} purchase confirmations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>Get efficiency tips and energy-saving recommendations</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-6">
                  <Button
                    onClick={() => {
                      // Dispatch a custom event to navigate to settings
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    className="bg-aurora-green hover:bg-aurora-green/80"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Setup {providerConfig.name} {providerConfig.terminology.device}
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check for Notifications
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((notification) => {
                  const actions = getNotificationActions(notification);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-800/30 transition-colors border-l-4 ${
                        getNotificationBorderColor(notification.type, notification.isRead)
                      } ${!notification.isRead ? 'bg-slate-800/20' : ''}`}
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
                                <div className="w-2 h-2 bg-aurora-green-light rounded-full animate-pulse"></div>
                              )}
                              
                              {/* Quick Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-slate-700/50"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                  {actions.map((action, index) => (
                                    <React.Fragment key={action.id}>
                                      <DropdownMenuItem
                                        onClick={() => handleQuickAction(action)}
                                        className={`cursor-pointer ${
                                          action.variant === 'destructive' 
                                            ? 'text-red-400 hover:bg-red-500/10' 
                                            : 'hover:bg-slate-700'
                                        }`}
                                      >
                                        {action.id === 'mark-read' && <Check className="h-4 w-4 mr-2" />}
                                        {action.id === 'buy-tokens' && <CreditCard className="h-4 w-4 mr-2" />}
                                        {action.id === 'copy-code' && <Copy className="h-4 w-4 mr-2" />}
                                        {action.id === 'view-insights' && <Eye className="h-4 w-4 mr-2" />}
                                        {action.id === 'setup-meter' && <Settings className="h-4 w-4 mr-2" />}
                                        {action.id === 'delete' && <Trash2 className="h-4 w-4 mr-2" />}
                                        {action.label}
                                      </DropdownMenuItem>
                                      {index < actions.length - 1 && action.id === 'copy-code' && (
                                        <DropdownMenuSeparator className="bg-slate-700" />
                                      )}
                                    </React.Fragment>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className={`text-sm ${
                            !notification.isRead ? 'text-gray-300' : 'text-gray-400'
                          } mb-2 leading-relaxed`}>
                            {notification.message}
                          </p>
                          
                          {/* Token-specific information */}
                          {(notification.tokenBalance !== undefined || notification.estimatedDays !== undefined) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {notification.tokenBalance !== undefined && (
                                <Badge variant="secondary" className="text-xs bg-slate-700/50">
                                  {providerConfig.type === 'solar' ? (
                                    <Sun className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Zap className="h-3 w-3 mr-1" />
                                  )}
                                  {providerConfig.terminology.credits.charAt(0).toUpperCase() + providerConfig.terminology.credits.slice(1)} Balance: KSh {notification.tokenBalance.toFixed(2)}
                                </Badge>
                              )}
                              {notification.estimatedDays !== undefined && (
                                <Badge variant="secondary" className="text-xs bg-slate-700/50">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {notification.estimatedDays} days remaining
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Token code for purchase notifications */}
                          {notification.metadata?.token_code && (
                            <div className="mb-2 p-2 bg-slate-800/50 rounded border border-aurora-green/20">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {providerConfig.terminology.credits.charAt(0).toUpperCase() + providerConfig.terminology.credits.slice(1)} Code:
                                  </p>
                                  <p className="text-sm font-mono text-aurora-green-light bg-slate-900/50 p-1 rounded">
                                    {notification.metadata.token_code}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => {
                                    navigator.clipboard.writeText(notification.metadata.token_code);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Reference number for transactions */}
                          {notification.metadata?.reference_number && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-xs">
                                Ref: {notification.metadata.reference_number}
                              </Badge>
                            </div>
                          )}

                          {/* Source table indicator for debugging */}
                          {notification.sourceTable && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-xs opacity-50">
                                Source: {notification.sourceTable}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                try {
                                  const date = notification.createdAt ? new Date(notification.createdAt) : new Date();
                                  return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true });
                                } catch (error) {
                                  return 'Just now';
                                }
                              })()}
                            </span>
                            
                            {/* Quick action buttons for mobile */}
                            {isMobile && (
                              <div className="flex items-center space-x-1">
                                {!notification.isRead && (
                                  <Button
                                    onClick={() => markAsRead(notification.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-6 px-2 hover:bg-aurora-green/20"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    setDeleteTarget('single');
                                    setShowDeleteDialog(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6 px-2 hover:bg-red-500/20 text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-aurora-card border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteTarget === 'single' 
                ? 'Are you sure you want to delete this notification? This action cannot be undone.'
                : 'Are you sure you want to delete all read notifications? This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Card */}
      {preferences && (
        <Card className="bg-aurora-card border-aurora-purple/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-aurora-purple-light flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>{providerConfig.name} Notification Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(preferences.preferences).map(([key, pref]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {key === 'token_alerts' && <Zap className="h-4 w-4 text-yellow-500" />}
                      {key === 'usage_alerts' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                      {key === 'bill_reminders' && <Calendar className="h-4 w-4 text-purple-500" />}
                      {key === 'system_updates' && <Settings className="h-4 w-4 text-orange-500" />}
                      {key === 'purchase_confirmations' && <CreditCard className="h-4 w-4 text-green-500" />}
                      <div>
                        <span className="text-sm capitalize">
                          {key === 'token_alerts' 
                            ? `${providerConfig.terminology.credits.charAt(0).toUpperCase() + providerConfig.terminology.credits.slice(1)} Alerts`
                            : key === 'purchase_confirmations'
                            ? `${providerConfig.terminology.credits.charAt(0).toUpperCase() + providerConfig.terminology.credits.slice(1)} Purchase Confirmations`
                            : key.replace('_', ' ')}
                        </span>
                        {pref.setup_required && (
                          <p className="text-xs text-muted-foreground">Setup required</p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        pref.enabled 
                          ? 'text-green-400 border-green-400/50' 
                          : 'text-gray-400 border-gray-400/50'
                      }`}
                    >
                      {pref.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  {preferences.has_meter 
                    ? `Your ${providerConfig.terminology.device} is connected and ${providerConfig.name} notifications are active.`
                    : `Connect your ${providerConfig.terminology.device} to activate all ${providerConfig.name} notification types.`
                  }
                </p>
                {!preferences.has_meter && (
                  <Button
                    onClick={() => {
                      // Dispatch a custom event to navigate to settings
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    size="sm"
                    className="bg-aurora-green hover:bg-aurora-green/80"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Setup {providerConfig.name} {providerConfig.terminology.device}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;