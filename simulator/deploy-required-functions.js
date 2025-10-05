// Script to deploy required database functions for smart meter
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration - using service role key for database operations
const supabaseUrl = 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM'; // Service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployRequiredFunctions() {
  try {
    console.log('Deploying required database functions for smart meter...');
    
    // Read the required functions SQL file
    const filePath = path.join(__dirname, 'deploy-required-functions.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log('Executing SQL from deploy-required-functions.sql...');
    
    // Split the SQL content into individual statements
    // We need to be careful with the function definitions that contain semicolons
    const statements = splitSqlStatements(sqlContent);
    
    for (const statement of statements) {
      if (statement.trim() === '') continue;
      
      console.log('Executing statement:', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      // Execute each statement
      const { error } = await supabase.rpc('execute_sql', { sql: statement });
      
      if (error) {
        console.error('Error executing statement:', error);
        // Don't stop on error, continue with other statements
      } else {
        console.log('Statement executed successfully');
      }
    }
    
    console.log('Required functions deployment complete');
  } catch (error) {
    console.error('Error deploying required functions:', error);
  }
}

function splitSqlStatements(sql) {
  // This is a simple splitter - in reality, we'd need a more sophisticated parser
  // but for our purposes, we'll split on semicolons that are not inside function definitions
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let parenthesesCount = 0;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // Skip comment lines
    if (line.trim().startsWith('--')) {
      currentStatement += line + '\n';
      continue;
    }
    
    // Check for function start
    if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
      inFunction = true;
      parenthesesCount = 0;
    }
    
    // Count parentheses
    for (const char of line) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
    }
    
    // Check for function end
    if (inFunction && line.includes('END;') && parenthesesCount <= 0) {
      inFunction = false;
    }
    
    currentStatement += line + '\n';
    
    // If we're not in a function definition and the line ends with semicolon, it's a complete statement
    if (!inFunction && line.trim().endsWith(';') && !line.includes('END;$$')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
    
    // Special handling for functions that end with $$;
    if (line.trim().endsWith('$$;')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim() !== '') {
    statements.push(currentStatement.trim());
  }
  
  return statements;
}

deployRequiredFunctions();