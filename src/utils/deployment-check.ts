// Deployment verification utility
export const deploymentCheck = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('Running in server environment');
    return {
      isBrowser: false,
      isSupabaseConfigured: false,
      envVars: {}
    };
  }

  // Check environment variables
  const envVars = {
    supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || 
                (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
                '',
    supabaseKey: import.meta.env?.VITE_SUPABASE_PUBLIC_KEY || 
                (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_PUBLIC_KEY) || 
                '',
    isProduction: import.meta.env?.PROD || 
                 (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') || 
                 false,
    origin: window.location.origin
  };

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(envVars.supabaseUrl && envVars.supabaseKey);

  console.log('Deployment Check Results:', {
    isBrowser: true,
    isSupabaseConfigured,
    isProduction: envVars.isProduction,
    origin: envVars.origin,
    supabaseUrlSet: !!envVars.supabaseUrl,
    supabaseKeySet: !!envVars.supabaseKey,
    envVars
  });

  return {
    isBrowser: true,
    isSupabaseConfigured,
    isProduction: envVars.isProduction,
    envVars
  };
};

// Run check on module load
deploymentCheck();