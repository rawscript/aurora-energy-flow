import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getUserId() {
  try {
    // Try to get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      console.log('You may need to sign in first or provide a valid session token');
      return;
    }
    
    if (user) {
      console.log('Current user ID:', user.id);
      console.log('You can use this ID to test the Puppeteer function:');
      console.log(`node test-kplc-puppeteer.js 92111973050 ${user.id}`);
    } else {
      console.log('No user is currently signed in');
      console.log('To test with a real user, please sign in to the application first');
    }
  } catch (error) {
    console.error('Exception during user retrieval:', error);
  }
}

// Run the function
getUserId();