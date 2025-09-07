
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, refreshSession } = useAuth();

  // Refresh session when component mounts
  useEffect(() => {
    if (user) {
      refreshSession().catch(console.error);
    }
  }, [user, refreshSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-aurora-green" />
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page with a state to indicate where to go after login
    return <Navigate to="/auth" state={{ from: window.location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
