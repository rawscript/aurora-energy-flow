#!/bin/bash

# Script to copy simulator files to root directory for easier access

echo "📋 Copying simulator files to root directory..."

# Copy smart-meter.html to root
cp simulator/smart-meter.html ./smart-meter.html

# Copy proxy server files to root
cp simulator/proxy-server.js ./proxy-server.js
cp simulator/proxy-package.json ./proxy-package.json
cp simulator/proxy-README.md ./proxy-README.md

echo "✅ Simulator files copied to root directory"
echo "📝 Don't forget to rename proxy-package.json to package.json if deploying the proxy server from root"