#!/bin/bash

# Oil Palm Backend Server Startup Script
# This script helps you start the backend server properly

echo "🌴 Oil Palm Backend Server Startup"
echo "===================================="
echo ""

# Check if MySQL is running
echo "📊 Checking MySQL database..."
if ! mysql -u root -e "USE oilplam; SELECT 1;" &> /dev/null; then
    echo "❌ MySQL is not running or database 'oilplam' doesn't exist!"
    echo "   Please start MySQL and create the database first."
    exit 1
fi
echo "✅ MySQL database is ready"
echo ""

# Get network IP
echo "🔍 Detecting network IP..."
NETWORK_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "📱 Your server will be accessible at: http://${NETWORK_IP}:3000/api"
echo ""
echo "⚠️  IMPORTANT: Update your app.json with this IP:"
echo "   \"API_URL_DEV\": \"http://${NETWORK_IP}:3000/api\""
echo ""

# Start server
echo "🚀 Starting backend server..."
NODE_ENV=development node server.js
