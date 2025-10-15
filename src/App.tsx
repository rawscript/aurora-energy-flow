import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EnergyProviderProvider } from "@/contexts/EnergyProviderContext";
import { MeterProvider } from "@/contexts/MeterContext";
import { lazy, Suspense, useState, useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
// Safely run deployment check
try {
  import("@/utils/deployment-check").then(({ deploymentCheck }) => {
    deploymentCheck();
  }).catch(error => {
    console.warn('Deployment check failed:', error);
  });
} catch (error) {
  console.warn('Failed to import deployment check:', error);
}

// Lazy load components for better mobile performance
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TestEnv = lazy(() => import("./test-env"));
const TestRealTime = lazy(() => import("./pages/TestRealTime"));
const TestSolarProvider = lazy(() => import("./pages/TestSolarProvider"));
const TestKPLCPuppeteer = lazy(() => import("./pages/TestKPLCPuppeteer"));
const MLTestComponent = lazy(() => import("./components/MLTestComponent"));



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
                    path="/test-kplc-puppeteer"
                    element={
                      <ProtectedRoute>
                        <TestKPLCPuppeteer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test-ml"
                    element={
                      <ProtectedRoute>
                        <MLTestComponent />
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
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Add comprehensive error logging
  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setErrorDetails(event.error?.message || 'Unknown error occurred');
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setErrorDetails(event.reason?.message || 'Promise rejection occurred');
      setHasError(true);
    };

    window.addEventListener('error', handleErrors);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Set loading to false after a short delay to allow initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      window.removeEventListener('error', handleErrors);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 border border-red-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
              <p className="text-sm text-gray-400">Application failed to load</p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-4">
            An error occurred while loading the application. Please try refreshing the page.
          </p>
          
          {errorDetails && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 rounded text-xs text-red-300 overflow-auto">
                {errorDetails}
              </pre>
            </details>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setHasError(false);
                setErrorDetails('');
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 1000);
              }}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
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