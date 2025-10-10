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

async function testKPLCPuppeteer() {
  try {
    console.log('Testing KPLC Puppeteer function...');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('Please provide meter number and user ID as command line arguments');
      console.log('Usage: node test-kplc-puppeteer.js <meter_number> <user_id>');
      console.log('Note: The ID number will be fetched from the user profile');
      process.exit(1);
    }
    
    const meterNumber = args[0];
    const userId = args[1];
    
    console.log(`Fetching bill data for meter: ${meterNumber}, User ID: ${userId}`);
    console.log('The ID number will be fetched from the user profile');
    
    // Call the Puppeteer function
    const { data, error } = await supabase.functions.invoke('puppeteer_kplc_service', {
      body: {
        action: 'fetch_bill_data',
        user_id: userId,
        meter_number: meterNumber
      }
    });
    
    if (error) {
      console.error('Error calling Puppeteer function:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Let's also try to get the response body if possible
      if (error.context && error.context.body) {
        try {
          const reader = error.context.body.getReader();
          const { value, done } = await reader.read();
          if (value) {
            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            console.error('Response body:', text);
          }
        } catch (e) {
          console.error('Could not read response body:', e);
        }
      }
      return;
    }
    
    console.log('Response from Puppeteer function:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data && data.success) {
      console.log('\n✅ Successfully fetched KPLC bill data!');
      console.log(`Account Name: ${data.data.accountName}`);
      console.log(`Meter Number: ${data.data.meterNumber}`);
      console.log(`Current Reading: ${data.data.currentReading} kWh`);
      console.log(`Bill Amount: KSh ${data.data.billAmount}`);
    } else {
      console.log('\n❌ Failed to fetch KPLC bill data');
      console.log(`Error: ${data?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Exception during test:', error);
  }
}

// Run the test
testKPLCPuppeteer();