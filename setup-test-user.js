import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

console.log('Supabase URL:', supabaseUrl);

if (!supabaseUrl || (!supabaseServiceKey || supabaseServiceKey === 'YOUR_SUPABASE_SERVICE_KEY')) {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local file');
  console.log('You can get the service key from your Supabase dashboard: Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTestUser() {
  try {
    const args = process.argv.slice(2);
    
    let userId, meterNumber, idNumber;
    
    if (args.length >= 3) {
      // Use provided values
      userId = args[0];
      meterNumber = args[1];
      idNumber = args[2];
    } else if (args.length === 2) {
      // Generate a UUID for user ID
      userId = randomUUID();
      meterNumber = args[0];
      idNumber = args[1];
    } else {
      // Use defaults with generated UUID
      userId = randomUUID();
      meterNumber = '92111973050';
      idNumber = '12345678';
    }
    
    console.log(`Setting up test user profile:`);
    console.log(`User ID: ${userId}`);
    console.log(`Meter Number: ${meterNumber}`);
    console.log(`ID Number: ${idNumber}`);
    
    // Create or update user profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        meter_number: meterNumber,
        phone_number: idNumber,
        full_name: 'Test User',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error setting up test user:', error);
      return;
    }
    
    console.log('✅ Test user profile created/updated successfully!');
    console.log('Now you can test the Puppeteer function with:');
    console.log(`node test-kplc-puppeteer.js ${meterNumber} ${userId}`);
    
  } catch (error) {
    console.error('Exception during setup:', error);
  }
}

// Run the setup
setupTestUser();