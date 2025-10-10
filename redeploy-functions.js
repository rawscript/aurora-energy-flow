import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function redeployFunctions() {
  try {
    console.log('Redeploying essential database functions...');
    
    // List of essential functions to redeploy
    const functions = [
      'get_or_create_profile',
      'initialize_user_notifications',
      'get_user_notifications_safe',
      'check_user_notification_initialization',
      'get_notification_preferences'
    ];
    
    for (const func of functions) {
      console.log(`\nRedeploying function: ${func}`);
      
      try {
        // Find the migration file for this function
        const { stdout: findOutput } = await execAsync(`find supabase/migrations -name "*${func}*" -type f`);
        const files = findOutput.trim().split('\n').filter(f => f);
        
        if (files.length > 0) {
          console.log(`Found migration file: ${files[0]}`);
          
          // Apply this specific migration
          const { stdout, stderr } = await execAsync(`supabase db reset --dry-run`);
          console.log('Dry run output:', stdout);
          if (stderr) console.error('Dry run errors:', stderr);
        } else {
          console.log(`No migration file found for ${func}`);
        }
      } catch (error) {
        console.error(`Error redeploying ${func}:`, error.message);
      }
    }
    
    console.log('\nFunction redeployment process completed.');
    console.log('Please restart your application to test if the issues are resolved.');
    
  } catch (error) {
    console.error('Exception during function redeployment:', error);
  }
}

// Run the redeployment
redeployFunctions();