#!/usr/bin/env node

/**
 * Database Setup Script for Aurora Energy Flow
 * 
 * This script creates the missing energy_readings and energy_insights tables
 * that the useRealTimeEnergy hook depends on.
 * 
 * Usage:
 *   node scripts/setup-database.js
 * 
 * Requirements:
 *   - VITE_SUPABASE_URL environment variable
 *   - VITE_SUPABASE_ANON_KEY environment variable
 *   - Or a .env file with these variables
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   VITE_SUPABASE_ANON_KEY');
  console.error('');
  console.error('Please set these in your .env file or environment.');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🚀 Setting up Aurora Energy Flow database...');
  console.log(`📡 Connecting to: ${SUPABASE_URL}`);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase_migrations', '001_create_energy_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('');
    console.log('⚠️  MANUAL SETUP REQUIRED');
    console.log('');
    console.log('This script cannot automatically execute SQL due to security restrictions.');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('');
    console.log('📋 Copy and paste the following SQL:');
    console.log('');
    console.log('=' .repeat(80));
    console.log(migrationSQL);
    console.log('=' .repeat(80));
    console.log('');
    console.log('✅ After running the SQL, your database will have:');
    console.log('   • energy_readings table (for storing meter readings)');
    console.log('   • energy_insights table (for demand-driven insights)');
    console.log('   • Proper indexes for performance');
    console.log('   • Row Level Security (RLS) policies');
    console.log('   • Sample data for testing');
    console.log('');
    console.log('🎯 This will fix the "energy_readings table not found" error');
    console.log('   in the useRealTimeEnergy hook.');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

// Alternative: Create a simple test to verify tables exist
async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test if we can connect and query
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Database connection test failed:', error.message);
      console.log('   This might be expected if tables don\'t exist yet.');
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test energy_readings table
    const { data: readingsData, error: readingsError } = await supabase
      .from('energy_readings')
      .select('id')
      .limit(1);
    
    if (readingsError) {
      console.log('❌ energy_readings table not found - migration needed');
      console.log('   Error:', readingsError.message);
    } else {
      console.log('✅ energy_readings table exists');
    }
    
    // Test energy_insights table
    const { data: insightsData, error: insightsError } = await supabase
      .from('energy_insights')
      .select('id')
      .limit(1);
    
    if (insightsError) {
      console.log('❌ energy_insights table not found - migration needed');
      console.log('   Error:', insightsError.message);
    } else {
      console.log('✅ energy_insights table exists');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (command === 'test') {
    await testDatabaseConnection();
  } else {
    await setupDatabase();
  }
}

main().catch(console.error);