#!/bin/bash

# Aurora Smart Meter Proxy Server Startup Script

echo "🚀 Starting Aurora Smart Meter Proxy Server"

# Check if .env file exists, if not create it from .env.example
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file from .env.example"
  cp .env.example .env
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the proxy server
echo "⚡ Starting proxy server..."
npm start