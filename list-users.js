import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service key for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'YOUR_SUPABASE_SERVICE_KEY') {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  try {
    console.log('Fetching users from the database...');
    
    // Get users from auth.users table
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, meter_number, phone_number')
      .limit(10);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log('Found users with profiles:');
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Name: ${user.full_name || 'N/A'}`);
        console.log(`   Meter: ${user.meter_number || 'N/A'}`);
        console.log(`   Phone: ${user.phone_number || 'N/A'}`);
        console.log('');
      });
      
      console.log('To test the Puppeteer function, use one of these user IDs:');
      console.log('Example: node test-kplc-puppeteer.js 92111973050', users[0].id);
    } else {
      console.log('No users with profiles found.');
      console.log('Please create a user profile through the Aurora application first.');
    }
  } catch (error) {
    console.error('Exception during user listing:', error);
  }
}

// Run the function
listUsers();