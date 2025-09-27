#!/bin/bash

# Aurora Proxy Server Deployment Script

echo "🚀 Starting Aurora Proxy Server Deployment"

# Check if we're on Render, Heroku, or Vercel
if [ -n "$RENDER" ]; then
  echo "📦 Running on Render"
  npm install
  npm start
elif [ -n "$HEROKU" ]; then
  echo "📦 Running on Heroku"
  npm install
  npm start
elif [ -n "$VERCEL" ]; then
  echo "📦 Running on Vercel"
  npm install
  npm start
else
  echo "🔧 Running locally"
  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
  fi
  
  echo "⚡ Starting proxy server..."
  npm start
fi