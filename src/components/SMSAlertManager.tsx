import React, { useState, useEffect } from 'react';
import { useAuroraSMS, AlertType, SMSAlert, SMSStats } from '../hooks/useAuroraSMS';
import { toast } from 'react-hot-toast';

interface SMSAlertManagerProps {
  className?: string;
}

export const SMSAlertManager: React.FC<SMSAlertManagerProps> = ({ className = '' }) => {
  const {
    sendSMSAlert,
    getUserSMSStats,
    getUserAlerts,
    updateAlertPreferences,
    enableSMSAlerts,
    alertTemplates,
    loading,
    error
  } = useAuroraSMS();

  const [stats, setStats] = useState<SMSStats | null>(null);
  const [alerts, setAlerts] = useState<SMSAlert[]>([]);
  const [showSendForm, setShowSendForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('general');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [preferences, setPreferences] = useState<Record<AlertType, boolean>>({
    general: true,
    energy_low: true,
    bill_due: true,
    token_purchase: true,
    system_alert: true,
    maintenance: false,
    emergency: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        getUserSMSStats(),
        getUserAlerts(20)
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading SMS data:', err);
      toast.error('Failed to load SMS data');
    }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !message) {
      toast.error('Phone number and message are required');
      return;
    }

    try {
      await sendSMSAlert(phoneNumber, message, { alert_type: alertType });
      toast.success('SMS alert sent successfully!');
      setPhoneNumber('');
      setMessage('');
      setShowSendForm(false);
      loadData(); // Refresh data
    } catch (err) {
      toast.error(error || 'Failed to send SMS alert');
    }
  };

  const handlePreferenceChange = async (type: AlertType, enabled: boolean) => {
    const newPreferences = { ...preferences, [type]: enabled };
    setPreferences(newPreferences);
    
    try {
      await updateAlertPreferences(newPreferences);
      toast.success('Alert preferences updated');
    } catch (err) {
      toast.error('Failed to update preferences');
      // Revert on error
      setPreferences(preferences);
    }
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    setAlertsEnabled(enabled);
    
    try {
      await enableSMSAlerts(enabled);
      toast.success(`SMS alerts ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update SMS alerts setting');
      // Revert on error
      setAlertsEnabled(!enabled);
    }
  };

  const useTemplate = (template: string) => {
    setMessage(template);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600';
      case 'sent': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return '✅';
      case 'sent': return '📤';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">SMS Alert Manager</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => handleToggleAlerts(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium">Enable SMS Alerts</span>
          </label>
          <button
            onClick={() => setShowSendForm(!showSendForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {showSendForm ? 'Cancel' : 'Send Alert'}
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">Total Sent</h3>
            <p className="text-2xl font-bold text-blue-900">{stats.total_sent}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">Delivered</h3>
            <p className="text-2xl font-bold text-green-900">{stats.total_delivered}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">Failed</h3>
            <p className="text-2xl font-bold text-red-900">{stats.total_failed}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-800">Total Cost</h3>
            <p className="text-2xl font-bold text-purple-900">KSh {stats.total_cost.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Send Alert Form */}
      {showSendForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Send SMS Alert</h3>
          <form onSubmit={handleSendAlert} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as AlertType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="energy_low">Energy Low</option>
                  <option value="bill_due">Bill Due</option>
                  <option value="token_purchase">Token Purchase</option>
                  <option value="system_alert">System Alert</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your alert message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {message.length}/160 characters
              </p>
            </div>

            {/* Template Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => useTemplate(alertTemplates.energyLow(50))}
                className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
              >
                Energy Low Template
              </button>
              <button
                type="button"
                onClick={() => useTemplate(alertTemplates.systemAlert('System maintenance completed successfully.'))}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
              >
                System Alert Template
              </button>
              <button
                type="button"
                onClick={() => useTemplate(alertTemplates.emergency('Power outage detected in your area.'))}
                className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded"
              >
                Emergency Template
              </button>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSendForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Alert'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alert Preferences */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Alert Preferences</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(preferences).map(([type, enabled]) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handlePreferenceChange(type as AlertType, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No alerts sent yet</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(alert.status)}</span>
                    <span className="font-medium">{alert.phone_number}</span>
                    <span className="text-sm text-gray-500 capitalize">{alert.alert_type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">{alert.message}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                  {alert.cost && (
                    <p className="text-xs text-gray-500">KSh {alert.cost}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};