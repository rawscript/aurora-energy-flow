import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Function to convert base64 encoded UUID back to standard UUID format
function convertBase64ToUUID(base64String) {
  try {
    // Remove any non-base64 characters
    const cleanBase64 = base64String.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Convert base64 to binary
    const binary = atob(cleanBase64);
    
    // Convert binary to hex
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      const hexByte = binary.charCodeAt(i).toString(16);
      hex += hexByte.length === 1 ? '0' + hexByte : hexByte;
    }
    
    // Format as UUID (8-4-4-4-12)
    if (hex.length === 32) {
      const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
      return uuid.toLowerCase();
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Function to convert character code string back to original string
function convertCharCodeString(charCodeString) {
  try {
    // Split the string into pairs of digits
    const pairs = charCodeString.match(/.{1,2}/g) || [];
    
    // Convert each pair back to character
    let result = '';
    for (const pair of pairs) {
      const charCode = parseInt(pair, 10);
      if (!isNaN(charCode)) {
        result += String.fromCharCode(charCode);
      }
    }
    
    return result;
  } catch (error) {
    return null;
  }
}

// Function to validate UUID format
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Function to try multiple decoding approaches
function tryMultipleDecodings(input) {
  console.log('Trying multiple decoding approaches...');
  
  // Approach 1: Direct character code conversion
  console.log('\n1. Trying character code conversion...');
  const charCodeResult = convertCharCodeString(input.replace(/[^0-9]/g, ''));
  if (charCodeResult) {
    console.log(`   Character code result: ${charCodeResult}`);
    if (isValidUUID(charCodeResult)) {
      return charCodeResult;
    }
  }
  
  // Approach 2: Base64 conversion
  console.log('\n2. Trying base64 conversion...');
  const base64Result = convertBase64ToUUID(input);
  if (base64Result) {
    console.log(`   Base64 result: ${base64Result}`);
    if (isValidUUID(base64Result)) {
      return base64Result;
    }
  }
  
  // Approach 3: Try with different cleaning
  console.log('\n3. Trying cleaned input...');
  const cleanedInput = input.replace(/[^0-9]/g, '');
  if (cleanedInput.length >= 32) {
    // Try to extract potential UUID parts
    const potentialUuid = cleanedInput.substring(0, 32);
    console.log(`   Potential UUID from cleaned input: ${potentialUuid}`);
    
    // Format as UUID
    if (potentialUuid.length === 32) {
      const formattedUuid = `${potentialUuid.substring(0, 8)}-${potentialUuid.substring(8, 12)}-${potentialUuid.substring(12, 16)}-${potentialUuid.substring(16, 20)}-${potentialUuid.substring(20, 32)}`;
      console.log(`   Formatted UUID: ${formattedUuid}`);
      if (isValidUUID(formattedUuid)) {
        return formattedUuid;
      }
    }
  }
  
  return null;
}

async function convertUserId() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.log('Usage: node convert-user-id.js <hashed_user_id>');
      console.log('Example: node convert-user-id.js "050102054051098056102100045052050102048045052053053098045097052052052045100099051100101052056099052052050050"');
      process.exit(1);
    }
    
    const hashedId = args[0];
    console.log(`Converting hashed user ID: ${hashedId}`);
    console.log(`Length: ${hashedId.length} characters`);
    
    // Try multiple decoding approaches
    const convertedId = tryMultipleDecodings(hashedId);
    
    if (convertedId) {
      console.log(`\n✅ Successfully converted to UUID: ${convertedId}`);
      
      if (isValidUUID(convertedId)) {
        console.log('✅ This is a valid UUID format that can be used with Supabase');
        console.log('You can now test the Puppeteer function with:');
        console.log(`node test-kplc-puppeteer.js 92111973050 ${convertedId}`);
        return convertedId;
      } else {
        console.log('❌ The converted ID is not in a valid UUID format');
      }
    } else {
      console.log('\n❌ Failed to convert the hashed ID to UUID using any approach');
      console.log('The input may not be a recognizable encoding format');
      console.log('\nSuggestions:');
      console.log('1. Sign in to the Aurora application and copy the actual user ID');
      console.log('2. Check the browser console when logged in to find your user ID');
      console.log('3. Use the list-users.js script to see existing users in the database');
    }
    
    return null;
  } catch (error) {
    console.error('Exception during conversion:', error);
    return null;
  }
}

// Run the conversion
convertUserId();