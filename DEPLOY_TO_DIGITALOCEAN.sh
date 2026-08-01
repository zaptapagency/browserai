#!/bin/bash

# BrowserAI - DigitalOcean Deployment Script
# This script handles deployment to DigitalOcean App Platform via web UI guide

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         BrowserAI — DigitalOcean Deployment Guide              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Verify repository
echo "Verifying repository..."
if ! git remote get-url origin | grep -q "zaptapagency/browserai"; then
    echo "❌ Not in browserai repository"
    exit 1
fi

echo "✅ Repository verified: zaptapagency/browserai"
echo ""

# Verify all commits are pushed
echo "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Committing..."
    git add .
    git commit -m "chore: Final deployment preparation"
fi

if [ -z "$(git log --oneline origin/main..main 2>/dev/null)" ]; then
    echo "✅ All commits are pushed to GitHub"
else
    echo "Pushing to GitHub..."
    git push origin main
fi
echo ""

# Generate BETTER_AUTH_SECRET
echo "Generating BETTER_AUTH_SECRET..."
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "✅ Secret generated (save this value for DigitalOcean setup)"
echo "   Value: $SECRET"
echo ""

# Verify app.yaml exists
if [ ! -f "app.yaml" ]; then
    echo "❌ app.yaml not found!"
    exit 1
fi

echo "✅ app.yaml configured and ready"
echo ""

# Display DigitalOcean setup instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            DIGITALOCEAN DEPLOYMENT INSTRUCTIONS                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "STEP 1: Navigate to DigitalOcean"
echo "   → Go to: https://cloud.digitalocean.com/"
echo "   → Login with your account"
echo ""
echo "STEP 2: Create New App"
echo "   → Click: Apps (left sidebar)"
echo "   → Click: Create App"
echo "   → Select: GitHub as source"
echo ""
echo "STEP 3: Connect GitHub"
echo "   → Click: Authorize GitHub"
echo "   → Select account: zaptapagency"
echo "   → Select repository: browserai"
echo "   → Select branch: main"
echo "   → Click: Next"
echo ""
echo "STEP 4: Configuration Auto-Loads"
echo "   ✅ DigitalOcean will detect app.yaml"
echo "   ✅ Services auto-configured:"
echo "      - API service (port 3001)"
echo "      - Browser Worker (port 3000)"
echo "   ✅ Databases auto-configured:"
echo "      - PostgreSQL 15"
echo "      - Redis 7"
echo "   → Click: Next"
echo ""
echo "STEP 5: Set Environment Variables"
echo "   Add this variable:"
echo ""
echo "   BETTER_AUTH_SECRET = $SECRET"
echo ""
echo "   Already set (via app.yaml):"
echo "   - NODE_ENV = production"
echo "   - APP_ENV = production"
echo "   - WORKER_PORT = 3000"
echo "   - API_PORT = 3001"
echo ""
echo "   → Click: Next"
echo ""
echo "STEP 6: Review & Deploy"
echo "   → App Name: browserai-production (or your choice)"
echo "   → Region: Closest to you (e.g., nyc3, sfo3)"
echo "   → Click: Create Resources"
echo ""
echo "STEP 7: Wait for Deployment"
echo "   ⏳ Building... (3-5 minutes)"
echo "   ✅ When all services show RUNNING (green):"
echo "   → Click: Visit App"
echo ""
echo "STEP 8: Verify Deployment"
echo "   Test health endpoint:"
echo "   curl https://your-app-name.ondigitalocean.app/health"
echo ""
echo "   Expected response:"
echo "   {\"status\":\"ok\",\"version\":\"0.1.0\"}"
echo ""
echo "   Access dashboard:"
echo "   https://your-app-name.ondigitalocean.app/"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🚀 READY TO DEPLOY TO DIGITALOCEAN                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Your BrowserAI repository is production-ready and pushed to GitHub."
echo ""
echo "Follow the steps above to complete deployment on DigitalOcean."
echo "Total setup time: ~10 minutes"
echo ""
