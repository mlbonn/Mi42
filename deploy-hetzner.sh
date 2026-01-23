#!/bin/bash

# FRIDAY CRM - Hetzner Deployment Script
# Run this on the Hetzner server: bash deploy-hetzner.sh

echo "🚀 FRIDAY CRM Deployment Starting..."

# Navigate to project directory
cd /root/friday-crm || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin version-b

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build project
echo "🔨 Building project..."
pnpm build

# Restart main server
echo "🔄 Restarting main server..."
pm2 restart friday-crm

# Restart Scout Worker
echo "🔄 Restarting Scout Worker..."
pm2 restart scout-worker

# Restart Hunter Worker
echo "🔄 Restarting Hunter Worker..."
pm2 restart hunter-worker

# Show status
echo "✅ Deployment complete! Status:"
pm2 status

echo ""
echo "🌐 Server URLs:"
echo "   Main: http://46.224.13.250:3000"
echo ""
echo "📊 Logs:"
echo "   Main:   pm2 logs friday-crm"
echo "   Scout:  pm2 logs scout-worker"
echo "   Hunter: pm2 logs hunter-worker"

