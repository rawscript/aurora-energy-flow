import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Only log significant state changes to reduce console noise
  const userIdRef = React.useRef<string | null>(null);
  const wasLoadingRef = React.useRef<boolean>(true);

  React.useEffect(() => {
    const currentUserId = user?.id || null;
    const isSignificantChange =
      currentUserId !== userIdRef.current ||
      (wasLoadingRef.current && !loading);

    if (isSignificantChange) {
      console.log('ProtectedRoute - State change:', {
        userId: currentUserId,
        loading,
        wasLoading: wasLoadingRef.current
      });
      userIdRef.current = currentUserId;
      wasLoadingRef.current = loading;
    }
  }, [user?.id, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-aurora-green" />
      </div>
    );
  }

  if (!user) {
    // Only log redirect once
    if (userIdRef.current !== null) {
      console.log('ProtectedRoute - User signed out, redirecting to /auth');
      userIdRef.current = null;
    }
    return <Navigate to="/auth" state={{ from: window.location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;