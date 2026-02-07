#!/bin/bash

# Cetus Rebalance Bot Startup Script

set -e

echo "========================================="
echo "Cetus Liquidity Rebalance Bot"
echo "========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "Dependencies not found. Installing..."
    npm install
fi

# Build the project
echo "Building the project..."
npm run build

# Start the bot
echo "Starting the bot..."
npm start
