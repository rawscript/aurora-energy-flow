import React, { useEffect, useState } from 'react';
import { CONFIG } from '@/config/env';
import { deploymentCheck } from '@/utils/deployment-check';

const TestEnv = () => {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...');
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    // Run deployment check
    const check = deploymentCheck();
    setEnvInfo(check);

    // Test Supabase connection
    const testSupabase = async () => {
      try {
        if (CONFIG.isSupabaseConfigured()) {
          // Try to get session (this won't require authentication)
          const { data, error } = await (window as any).supabase.auth.getSession();
          
          if (error) {
            setSupabaseStatus('Error');
            setSupabaseError(error.message);
          } else {
            setSupabaseStatus('Connected');
            setSupabaseError(null);
          }
        } else {
          setSupabaseStatus('Not Configured');
          setSupabaseError('Missing environment variables');
        }
      } catch (error: any) {
        setSupabaseStatus('Error');
        setSupabaseError(error.message);
      }
    };

    testSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-sm border border-aurora-green/20 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-aurora-green-light mb-6 text-center">Environment Configuration Test</h1>
        
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-3">Environment Variables</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">VITE_SUPABASE_URL:</span>
                <span className={CONFIG.SUPABASE_URL ? 'text-green-400' : 'text-red-400'}>
                  {CONFIG.SUPABASE_URL ? 'SET' : 'MISSING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">VITE_SUPABASE_PUBLIC_KEY:</span>
                <span className={CONFIG.SUPABASE_PUBLIC_KEY ? 'text-green-400' : 'text-red-400'}>
                  {CONFIG.SUPABASE_PUBLIC_KEY ? 'SET' : 'MISSING'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-3">Configuration Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Supabase Configured:</span>
                <span className={CONFIG.isSupabaseConfigured() ? 'text-green-400' : 'text-red-400'}>
                  {CONFIG.isSupabaseConfigured() ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Supabase Connection:</span>
                <span className={
                  supabaseStatus === 'Connected' ? 'text-green-400' : 
                  supabaseStatus === 'Error' ? 'text-red-400' : 
                  'text-yellow-400'
                }>
                  {supabaseStatus}
                </span>
              </div>
              {supabaseError && (
                <div className="mt-2 p-2 bg-red-900/30 rounded">
                  <p className="text-red-300 text-sm">{supabaseError}</p>
                </div>
              )}
            </div>
          </div>

          {envInfo && (
            <div className="bg-slate-900/50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-3">Deployment Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Environment:</span>
                  <span className="text-gray-200">{envInfo.isProduction ? 'Production' : 'Development'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Origin:</span>
                  <span className="text-gray-200">{window.location.origin}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-3">Next Steps</h2>
            <div className="space-y-2 text-sm text-gray-300">
              {CONFIG.isSupabaseConfigured() ? (
                <>
                  <p>✅ Environment variables are properly configured</p>
                  <p>✅ Supabase should be working correctly</p>
                  <p className="mt-3">If you're still experiencing issues:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Clear your browser cache and localStorage</li>
                    <li>Check the browser console for errors</li>
                    <li>Verify your Supabase dashboard settings</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>❌ Environment variables are missing</p>
                  <p className="mt-3">To fix this:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLIC_KEY on your deployment platform</li>
                    <li>Redeploy your application</li>
                    <li>Refer to DEPLOYMENT_CHECKLIST.md for detailed instructions</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-aurora-green hover:bg-aurora-green/80 text-white rounded transition-colors"
          >
            Refresh Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestEnv;