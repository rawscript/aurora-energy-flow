import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-aurora-dark flex items-center justify-center p-4">
      <Card className="bg-aurora-card border-red-500/20 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-400">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            An error occurred while loading the application. This might be due to a temporary issue.
          </p>
          
          {error && (
            <details className="bg-slate-800/50 p-3 rounded-lg">
              <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-400 whitespace-pre-wrap break-words">
                {error.message}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRefresh}
              className="bg-aurora-green hover:bg-aurora-green/80"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/auth'}
              className="border-aurora-blue/30 hover:bg-aurora-blue/10"
            >
              Go to Sign In
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorFallback;