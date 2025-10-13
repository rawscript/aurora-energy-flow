import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for diagnosing authentication issues
 * Helps track down repeated sign-in messages, rate limiting, and session problems
 */
export const useAuthDiagnostics = () => {
  const { user, session } = useAuth();
  const diagnosticsRef = useRef({
    signInCount: 0,
    lastSignInTime: 0,
    sessionCheckCount: 0,
    lastSessionCheckTime: 0,
    errorCount: 0,
    lastErrorTime: 0
  });

  // Monitor sign-in events
  useEffect(() => {
    if (user && session) {
      const now = Date.now();
      // Only count as a new sign-in if it's been more than 5 seconds since the last one
      if (now - diagnosticsRef.current.lastSignInTime > 5000) {
        diagnosticsRef.current.signInCount++;
        diagnosticsRef.current.lastSignInTime = now;
        console.log(`[Auth Diagnostics] Sign in #${diagnosticsRef.current.signInCount}`);
      }
    }
  }, [user, session]);

  // Log diagnostics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const diag = diagnosticsRef.current;
      const now = Date.now();
      
      // Log diagnostics every 5 minutes if there's activity
      if (diag.signInCount > 0 || diag.sessionCheckCount > 0 || diag.errorCount > 0) {
        console.log('[Auth Diagnostics Summary]', {
          signInCount: diag.signInCount,
          secondsSinceLastSignIn: diag.lastSignInTime ? Math.floor((now - diag.lastSignInTime) / 1000) : 'N/A',
          sessionCheckCount: diag.sessionCheckCount,
          errorCount: diag.errorCount,
          time: new Date().toISOString()
        });
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Return diagnostic functions
  const resetDiagnostics = () => {
    diagnosticsRef.current = {
      signInCount: 0,
      lastSignInTime: 0,
      sessionCheckCount: 0,
      lastSessionCheckTime: 0,
      errorCount: 0,
      lastErrorTime: 0
    };
  };

  const getDiagnostics = () => {
    return { ...diagnosticsRef.current };
  };

  return {
    resetDiagnostics,
    getDiagnostics
  };
};