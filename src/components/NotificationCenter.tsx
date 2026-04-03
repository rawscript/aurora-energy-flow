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
    <div className="space-y-6 sm:space-y-8 animate-fade-in py-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-3 rounded-2xl bg-aurora-green/10 border border-aurora-green/20 relative z-10">
                  {isEmptyState ? (
                    <BellOff className="h-7 w-7 text-slate-400" />
                  ) : (
                    <Bell className="h-7 w-7 text-aurora-green-light" />
                  )}
                </div>
                {!isEmptyState && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#0f172a] z-20 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-2xl text-white font-bold tracking-tight">
                  Notification Hub
                </CardTitle>
                <CardDescription className="text-slate-400 font-medium">
                  {isEmptyState ? 'Neural bridge clear' : `Syncing ${notifications.length} alerts • ${unreadCount} unread`}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="h-10 px-4 border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs uppercase tracking-widest"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                REFRESH
              </Button>
              
              {!isEmptyState && unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 border-aurora-green/30 hover:bg-aurora-green/10 text-aurora-green-light font-bold text-xs uppercase tracking-widest"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  MARK READ
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List or Empty State */}
      <Card className="overflow-hidden border-white/10">
        <CardContent className="p-0">
          <ScrollArea className={`${isMobile ? 'h-96' : 'h-[600px]'} w-full`}>
            {isEmptyState ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-aurora-green/10 rounded-full blur-2xl"></div>
                  <BellOff className="h-10 w-10 text-slate-500 relative z-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Neural Bridge Clear
                </h3>
                <p className="text-slate-400 max-w-sm mb-12 font-medium leading-relaxed">
                  The {providerConfig.name} sync stream is currently idle. Alerts and efficiency reports will manifest here once your hardware is active.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                    <Settings className="h-8 w-8 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">Device Sync</h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Link your {providerConfig.terminology.device} to activate real-time telemetry.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                    <TrendingUp className="h-8 w-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">Neural Insights</h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Optimization protocols will generate saving recommendations here.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-md px-4">
                  <Button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    className="flex-1 h-12 font-bold tracking-wider"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    INITIALIZE SYNC
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => {
                  const actions = getNotificationActions(notification);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-6 hover:bg-white/5 transition-all duration-300 relative group cursor-default ${
                        !notification.isRead ? 'bg-aurora-green/[0.03]' : ''
                      }`}
                    >
                      {/* Read/Unread indicator bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                        !notification.isRead ? 'bg-aurora-green animate-pulse' : 'bg-transparent'
                      }`} />

                      <div className="flex items-start space-x-5">
                        <div className={`p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110 ${
                          !notification.isRead ? 'bg-aurora-green/10 border border-aurora-green/20' : 'bg-white/5 border border-white/10'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <h4 className={`text-base font-bold truncate ${
                                !notification.isRead ? 'text-white' : 'text-slate-300'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0 h-5 ${getSeverityColor(notification.severity)} border-none`}
                              >
                                {notification.severity}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">
                                {(() => {
                                  try {
                                    const date = notification.createdAt ? new Date(notification.createdAt) : new Date();
                                    return isNaN(date.getTime()) ? 'NOW' : formatDistanceToNow(date, { addSuffix: true }).toUpperCase();
                                  } catch (error) {
                                    return 'NOW';
                                  }
                                })()}
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg"
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a1f2c]/95 border-white/10 backdrop-blur-xl">
                                  {actions.map((action, index) => (
                                    <React.Fragment key={action.id}>
                                      <DropdownMenuItem
                                        onClick={() => handleQuickAction(action)}
                                        className={`cursor-pointer font-bold text-xs p-3 ${
                                          action.variant === 'destructive' 
                                            ? 'text-red-400 focus:bg-red-500/10' 
                                            : 'text-slate-300 focus:bg-white/10 focus:text-white'
                                        }`}
                                      >
                                        {action.id === 'mark-read' && <Check className="h-4 w-4 mr-3" />}
                                        {action.id === 'buy-tokens' && <CreditCard className="h-4 w-4 mr-3" />}
                                        {action.id === 'copy-code' && <Copy className="h-4 w-4 mr-3" />}
                                        {action.id === 'view-insights' && <Eye className="h-4 w-4 mr-3" />}
                                        {action.id === 'setup-meter' && <Settings className="h-4 w-4 mr-3" />}
                                        {action.id === 'delete' && <Trash2 className="h-4 w-4 mr-3" />}
                                        {action.label.toUpperCase()}
                                      </DropdownMenuItem>
                                      {index < actions.length - 1 && action.id === 'copy-code' && (
                                        <DropdownMenuSeparator className="bg-white/5" />
                                      )}
                                    </React.Fragment>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className={`text-sm mb-4 leading-relaxed font-medium ${
                            !notification.isRead ? 'text-slate-300' : 'text-slate-400'
                          }`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            {(notification.tokenBalance !== undefined || notification.estimatedDays !== undefined) && (
                              <>
                                {notification.tokenBalance !== undefined && (
                                  <Badge variant="secondary" className="bg-white/5 text-white border-white/5 font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                                    {providerConfig.terminology.credits}: KSh {notification.tokenBalance.toFixed(2)}
                                  </Badge>
                                )}
                                {notification.estimatedDays !== undefined && (
                                  <Badge variant="secondary" className="bg-white/5 text-white border-white/5 font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                                    HORIZON: {notification.estimatedDays} DAYS
                                  </Badge>
                                )}
                              </>
                            )}

                            {notification.metadata?.token_code && (
                              <div className="flex items-center space-x-2 bg-aurora-green-light/10 p-1.5 px-3 rounded-lg border border-aurora-green/20">
                                <span className="text-[10px] font-bold text-aurora-green-light uppercase tracking-widest mr-2">TOKEN:</span>
                                <span className="text-xs font-mono font-bold text-white tracking-widest">{notification.metadata.token_code}</span>
                                <Button
                                  onClick={() => navigator.clipboard.writeText(notification.metadata.token_code)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-aurora-green/20 text-aurora-green-light"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {notification.metadata?.reference_number && (
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded">REF: {notification.metadata.reference_number}</span>
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

      {/* Notification Preferences Card */}
      {preferences && (
        <Card className="overflow-hidden border-white/10">
          <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
            <CardTitle className="text-lg text-white font-bold flex items-center space-x-4">
              <div className="p-1.5 rounded-lg bg-aurora-purple/10 border border-aurora-purple/20">
                <Settings className="h-5 w-5 text-aurora-purple-light" />
              </div>
              <span>Protocol Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(preferences.preferences).map(([key, pref]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${pref.enabled ? 'bg-white/10' : 'opacity-40'}`}>
                        {key === 'token_alerts' && <Zap className="h-4 w-4 text-yellow-500" />}
                        {key === 'usage_alerts' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                        {key === 'bill_reminders' && <Calendar className="h-4 w-4 text-purple-500" />}
                        {key === 'system_updates' && <Settings className="h-4 w-4 text-orange-500" />}
                        {key === 'purchase_confirmations' && <CreditCard className="h-4 w-4 text-green-500" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${pref.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {pref.enabled ? 'Protocol Active' : 'Protocol Suspended'}
                        </span>
                      </div>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${pref.enabled ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
                  </div>
                ))}
              </div>
              
              <div className="text-center pt-4">
                <p className="text-xs font-medium text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
                  {preferences.has_meter 
                    ? `Neural downlink with ${providerConfig.terminology.device} is stable. All protocol streams are active.`
                    : `Link your secondary ${providerConfig.terminology.device} to unlock full protocol telemetry.`
                  }
                </p>
                {!preferences.has_meter && (
                  <Button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'settings' }));
                    }}
                    variant="outline"
                    className="h-12 px-8 font-bold tracking-widest border-aurora-green/30 text-aurora-green-light hover:bg-aurora-green/10"
                  >
                    LINK HARDWARE
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1a1f2c]/95 border-white/10 backdrop-blur-xl">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/20">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white text-center">Terminate Logs?</DialogTitle>
            <DialogDescription className="text-slate-400 text-center font-medium leading-relaxed">
              {deleteTarget === 'single' 
                ? 'Are you certain you wish to purge this specific record from the neural memory?'
                : 'Are you certain you wish to purge all read records from the neural memory?'
              }
              <br />
              <span className="text-red-400/80 text-xs font-bold uppercase tracking-widest mt-2 block">This action is irreversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="px-8 h-12 font-bold tracking-widest border-white/10 hover:bg-white/5 text-slate-300"
            >
              ABORT
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="px-8 h-12 font-bold tracking-widest bg-red-600 hover:bg-red-700"
            >
              CONFIRM DELETION
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationCenter;