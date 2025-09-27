@echo off
REM Script to copy simulator files to root directory for easier access

echo 📋 Copying simulator files to root directory...

REM Copy smart-meter.html to root
copy simulator\smart-meter.html .\smart-meter.html

REM Copy proxy server files to root
copy simulator\proxy-server.js .\proxy-server.js
copy simulator\proxy-package.json .\proxy-package.json
copy simulator\proxy-README.md .\proxy-README.md

echo ✅ Simulator files copied to root directory
echo 📝 Don't forget to rename proxy-package.json to package.json if deploying the proxy server from root