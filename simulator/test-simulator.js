// Simple test script to verify the simulator files
const fs = require('fs');
const path = require('path');

// Check if required files exist
const requiredFiles = [
  'smart-meter.html',
  'package.json',
  'netlify.toml'
];

console.log('🔍 Testing Aurora Smart Meter Simulator files...\n');

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 All required files are present!');
  console.log('\n📝 Deployment instructions:');
  console.log('1. For Netlify drag-and-drop: Drag smart-meter.html to Netlify deployment area');
  console.log('2. For GitHub integration: Push this directory to GitHub and connect to Netlify');
  console.log('3. For CLI deployment: Run "netlify deploy --prod"');
  console.log('\n⚠️  Remember to update the proxyUrl in smart-meter.html before deployment:');
  console.log('   const AURORA_CONFIG = {');
  console.log('     // ...');
  console.log('     proxyUrl: "https://your-proxy-server.onrender.com/proxy/supabase-function"');
  console.log('   };');
} else {
  console.log('❌ Some required files are missing. Please check the simulator directory.');
}

console.log('\n' + '='.repeat(50));