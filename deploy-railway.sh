#!/bin/bash

# Flight Booking System - Railway Deployment Script
# This script deploys the entire system to Railway

set -e

echo "🚀 Flight Booking System - Railway Deployment"
echo "=============================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Not logged in to Railway. Please login..."
    railway login
    echo ""
fi

echo "✅ Logged in to Railway"
echo ""

# Create project
echo "📦 Creating Railway project..."
if [ ! -f ".railway" ]; then
    railway init <<EOF
flight-booking-system
EOF
    echo "✅ Project created"
else
    echo "ℹ️  Project already exists"
fi
echo ""

# Add PostgreSQL
echo "🐘 Adding PostgreSQL database..."
railway add --database postgresql || echo "ℹ️  PostgreSQL may already exist"
echo ""

# Add Redis
echo "📮 Adding Redis..."
railway add --database redis || echo "ℹ️  Redis may already exist"
echo ""

# Set environment variables
echo "⚙️  Setting environment variables..."
echo ""
echo "Please set the following variables in Railway dashboard:"
echo "https://railway.app/dashboard"
echo ""
echo "Required variables:"
echo "- JWT_SECRET (generate with: openssl rand -base64 32)"
echo "- ENCRYPTION_KEY (32 characters)"
echo "- AMADEUS_API_KEY"
echo "- AMADEUS_API_SECRET"
echo "- STRIPE_SECRET_KEY"
echo "- STRIPE_PUBLISHABLE_KEY"
echo "- SMTP_HOST"
echo "- SMTP_USER"
echo "- SMTP_PASSWORD"
echo ""

read -p "Have you set the environment variables? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set variables and run this script again."
    exit 1
fi

# Deploy
echo "🚢 Deploying to Railway..."
railway up
echo ""

echo "✅ Deployment initiated!"
echo ""
echo "📊 View deployment status:"
railway status
echo ""
echo "🌐 Open Railway dashboard:"
echo "railway open"
echo ""
echo "📋 View logs:"
echo "railway logs"
echo ""
echo "🎉 Deployment complete!"
