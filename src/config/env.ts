// Environment configuration helper
export const getEnvVar = (name: string, defaultValue?: string): string => {
  try {
    // Try Vite's import.meta.env first (for development and production builds)
    if (import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
    
    // Try process.env (for Node.js environments)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name] || '';
    }
    
    // Return default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // Log warning instead of throwing error
    console.warn(`Environment variable ${name} is not defined`);
    return '';
  } catch (error) {
    console.warn(`Error accessing environment variable ${name}:`, error);
    return defaultValue || '';
  }
};

// Configuration constants
export const CONFIG = {
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  SUPABASE_PUBLIC_KEY: getEnvVar('VITE_SUPABASE_PUBLIC_KEY', ''),
  OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY', ''),
  REDIS_URL: getEnvVar('VITE_REDIS_URL', ''),
  REDIS_PORT: getEnvVar('VITE_REDIS_PORT', ''),
  REDIS_PASSWORD: getEnvVar('VITE_REDIS_PASSWORD', ''),
  
  // Check if essential services are configured
  isSupabaseConfigured: () => {
    return !!(getEnvVar('VITE_SUPABASE_URL', '') && getEnvVar('VITE_SUPABASE_PUBLIC_KEY', ''));
  },
  
  isRedisConfigured: () => {
    return !!(getEnvVar('VITE_REDIS_URL', '') && getEnvVar('VITE_REDIS_PORT', ''));
  }
};

// Log configuration status safely
try {
  console.log('✅ Environment Configuration Status:', {
    supabaseConfigured: CONFIG.isSupabaseConfigured(),
    redisConfigured: CONFIG.isRedisConfigured(),
    supabaseUrl: CONFIG.SUPABASE_URL ? 'SET' : 'MISSING',
    supabaseKey: CONFIG.SUPABASE_PUBLIC_KEY ? 'SET' : 'MISSING'
  });
} catch (error) {
  console.warn('❌ Error checking environment configuration:', error);
}