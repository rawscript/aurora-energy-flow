#!/bin/bash

# Aurora Smart Meter Simulator Deployment Script

echo "🚀 Starting Aurora Smart Meter Simulator Deployment"

# Check if we're in the simulator directory
if [ ! -f "smart-meter.html" ]; then
  echo "❌ Please run this script from the simulator directory"
  exit 1
fi

echo "📋 Checking for required files..."
REQUIRED_FILES=("smart-meter.html" "proxy-server.js" "proxy-package.json")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

echo "✅ All required files found"

echo "📦 Installing proxy server dependencies..."
npm install --prefix .

if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo "✅ Dependencies installed successfully"

echo "📋 Deployment instructions:"
echo "1. Deploy smart-meter.html to a static hosting service (Netlify, Vercel, etc.)"
echo "2. Deploy the proxy server to a cloud platform (Render, Heroku, Vercel, etc.):"
echo "   - For Render: Create a new Web Service and point it to this directory"
echo "   - For Heroku: Use 'heroku create' and 'git push heroku master'"
echo "   - For Vercel: Use 'vercel' command or import the directory"
echo "3. Update the proxyUrl in smart-meter.html to point to your deployed proxy server"
echo "4. Test the deployment by visiting your smart meter simulator URL"

echo "✅ Setup complete! Follow the instructions above to deploy."