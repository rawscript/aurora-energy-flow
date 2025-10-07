import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EnergyProviderProvider } from "@/contexts/EnergyProviderContext";
import { MeterProvider } from "@/contexts/MeterContext";
import { lazy, Suspense, useState, useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { deploymentCheck } from "@/utils/deployment-check";

// Run deployment check
deploymentCheck();

// Lazy load components for better mobile performance
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TestEnv = lazy(() => import("./test-env"));
const TestRealTime = lazy(() => import("./pages/TestRealTime"));
const TestSolarProvider = lazy(() => import("./pages/TestSolarProvider"));

// Optimized query client for better performance and caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch when component mounts if data exists
      refetchOnReconnect: true, // Refetch when network reconnects
      networkMode: 'offlineFirst', // Use cached data when offline
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
      networkMode: 'offlineFirst',
    },
  },
});

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-aurora-dark">
    <div className="relative">
      <div className="w-16 h-16 bg-aurora-gradient rounded-full flex items-center justify-center mb-4 animate-pulse">
        <div className="h-8 w-8 bg-white rounded-sm"></div>
      </div>
      <div className="absolute inset-0 w-16 h-16 border-4 border-aurora-green/30 border-t-aurora-green rounded-full animate-spin"></div>
    </div>
    <p className="text-aurora-green-light text-sm font-medium">Loading Aurora Energy...</p>
  </div>
);

const AppContent = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <EnergyProviderProvider>
          <MeterProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/test-env" element={<TestEnv />} />
                  <Route path="/test-realtime" element={<TestRealTime />} />
                  <Route
                    path="/test-solar"
                    element={
                      <ProtectedRoute>
                        <TestSolarProvider />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </MeterProvider>
        </EnergyProviderProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => {
  const [hasError, setHasError] = useState(false);

  // Add error logging
  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleErrors);

    return () => {
      window.removeEventListener('error', handleErrors);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-aurora-dark text-white p-4">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-center mb-6">An error occurred while loading the application. Please try refreshing the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-aurora-green text-white rounded hover:bg-aurora-green/80 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;