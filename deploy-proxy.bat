@echo off
REM Aurora Proxy Server Deployment Script for Windows

echo 🚀 Starting Aurora Proxy Server Deployment

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📥 Installing dependencies...
    npm install
)

echo ⚡ Starting proxy server...
npm start