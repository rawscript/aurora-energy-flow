import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Wifi, WifiOff, Settings, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { africasTalkingSMSService, shouldUseSMSFallback } from '../utils/africasTalkingSMS';
import { useToast } from '../hooks/use-toast';

interface SMSFallbackStatusProps {
  energyProvider: string;
  onConfigureClick?: () => void;
}

export const SMSFallbackStatus: React.FC<SMSFallbackStatusProps> = ({
  energyProvider,
  onConfigureClick
}) => {
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSmsConfigured(africasTalkingSMSService.isConfigured());
  }, []);

  const testSMSConnection = async () => {
    setTesting(true);
    try {
      // Test USSD connection
      const result = await africasTalkingSMSService.sendUSSDRequest('*144#', '+254700000000');
      
      if (result.success) {
        toast({
          title: 'SMS Service Test Successful',
          description: 'Africa\'s Talking SMS service is working correctly.',
        });
      } else {
        toast({
          title: 'SMS Service Test Failed',
          description: result.error || 'Failed to connect to SMS service.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'SMS Service Test Error',
        description: 'An error occurred while testing the SMS service.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const shouldShowSMSFallback = energyProvider === 'KPLC';
  const smsAvailable = shouldUseSMSFallback(energyProvider);

  if (!shouldShowSMSFallback) {
    return null;
  }

  return (
    <Card className="border-aurora-blue/20 bg-gradient-to-br from-aurora-dark/50 to-aurora-blue/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-aurora-blue-light" />
          SMS Fallback Service
          {smsAvailable ? (
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          SMS fallback provides an alternative way to fetch KPLC data and purchase tokens when the web portal is unavailable.
        </div>

        {smsConfigured ? (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              Africa's Talking SMS service is configured and ready to use as a fallback for KPLC operations.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-500/30 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              SMS fallback is not configured. Add your Africa's Talking credentials to enable this feature.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-medium text-aurora-green-light">Features Available:</div>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-400" />
                Balance inquiry via SMS
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-400" />
                Token purchase via SMS
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-400" />
                USSD integration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-400" />
                Automatic fallback
              </li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium text-aurora-green-light">Service Status:</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Configuration:</span>
                {smsConfigured ? (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">KPLC SMS (95551):</span>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {smsConfigured && (
            <Button
              variant="outline"
              size="sm"
              onClick={testSMSConnection}
              disabled={testing}
              className="border-aurora-blue/30 hover:bg-aurora-blue/10"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-aurora-blue-light mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigureClick}
            className="border-aurora-blue/30 hover:bg-aurora-blue/10"
          >
            <Settings className="h-3 w-3 mr-2" />
            {smsConfigured ? 'Manage' : 'Configure'}
          </Button>
        </div>

        {!smsConfigured && (
          <div className="text-xs text-muted-foreground bg-aurora-dark/30 p-3 rounded-lg border border-aurora-blue/10">
            <div className="font-medium mb-1">To enable SMS fallback:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Sign up for Africa's Talking SMS service</li>
              <li>Get your API key and username</li>
              <li>Add them to your environment variables</li>
              <li>Restart the application</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};