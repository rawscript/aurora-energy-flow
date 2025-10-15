// Deployment verification utility
export const deploymentCheck = () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('Running in server environment');
      return {
        isBrowser: false,
        isSupabaseConfigured: false,
        envVars: {}
      };
    }

    // Safely check environment variables
    const envVars = {
      supabaseUrl: '',
      supabaseKey: '',
      isProduction: false,
      origin: ''
    };

    try {
      envVars.supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
      envVars.supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLIC_KEY || '';
      envVars.isProduction = import.meta.env?.PROD || false;
      envVars.origin = window.location?.origin || '';
    } catch (error) {
      console.warn('Error accessing environment variables:', error);
    }

    // Check if Supabase is configured
    const isSupabaseConfigured = !!(envVars.supabaseUrl && envVars.supabaseKey);

    const result = {
      isBrowser: true,
      isSupabaseConfigured,
      isProduction: envVars.isProduction,
      origin: envVars.origin,
      supabaseUrlSet: !!envVars.supabaseUrl,
      supabaseKeySet: !!envVars.supabaseKey
    };

    console.log('✅ Deployment Check Results:', result);

    return {
      isBrowser: true,
      isSupabaseConfigured,
      isProduction: envVars.isProduction,
      envVars
    };
  } catch (error) {
    console.error('❌ Deployment check failed:', error);
    return {
      isBrowser: true,
      isSupabaseConfigured: false,
      isProduction: false,
      envVars: {},
      error: error.message
    };
  }
};