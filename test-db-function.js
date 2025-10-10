import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM') {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDbFunction() {
  try {
    console.log('Testing database function...');
    
    // Test get_or_create_profile function
    console.log('Testing get_or_create_profile function...');
    
    const { data, error } = await supabase.rpc('get_or_create_profile', {
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_email: 'test@example.com',
      p_full_name: 'Test User',
      p_phone_number: '123456789',
      p_meter_number: '92111973050'
    });
    
    if (error) {
      console.error('Error calling get_or_create_profile function:', error);
      return;
    }
    
    console.log('Function call successful!');
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Test initialize_user_notifications function
    console.log('\nTesting initialize_user_notifications function...');
    
    const { data: initData, error: initError } = await supabase.rpc('initialize_user_notifications', {
      p_user_id: '00000000-0000-0000-0000-000000000001'
    });
    
    if (initError) {
      console.error('Error calling initialize_user_notifications function:', initError);
      return;
    }
    
    console.log('initialize_user_notifications call successful!');
    console.log('Data:', JSON.stringify(initData, null, 2));
    
  } catch (error) {
    console.error('Exception during test:', error);
  }
}

// Run the test
testDbFunction();