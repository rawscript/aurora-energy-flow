@echo off
REM Aurora Smart Meter Proxy Server Startup Script for Windows

echo 🚀 Starting Aurora Smart Meter Proxy Server

REM Check if .env file exists, if not create it from .env.example
if not exist ".env" (
  echo 📝 Creating .env file from .env.example
  copy .env.example .env
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
  echo 📦 Installing dependencies...
  npm install
)

REM Start the proxy server
echo ⚡ Starting proxy server...
npm start