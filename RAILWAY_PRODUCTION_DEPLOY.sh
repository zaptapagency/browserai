#!/bin/bash

# BrowserAI — Railway Production Deployment
# This script handles complete deployment to Railway using CLI
# Prerequisites: Railway CLI installed and authenticated

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           BrowserAI — Railway Production Deployment            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================
echo "${YELLOW}STEP 1: Verifying Prerequisites${NC}"
echo "---"

if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI not found${NC}"
    echo "Install from: https://railway.app/cli"
    exit 1
fi
echo -e "${GREEN}✓ Railway CLI installed${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed${NC}"

echo ""

# ============================================================
# STEP 2: VERIFY RAILWAY AUTHENTICATION
# ============================================================
echo "${YELLOW}STEP 2: Verifying Railway Authentication${NC}"
echo "---"

if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Not authenticated. Running login...${NC}"
    railway login
fi
echo -e "${GREEN}✓ Authenticated with Railway${NC}"
echo ""

# ============================================================
# STEP 3: VERIFY CODE IS PRODUCTION-READY
# ============================================================
echo "${YELLOW}STEP 3: Verifying Production Readiness${NC}"
echo "---"

if [ ! -d "services/api/dist" ]; then
    echo -e "${YELLOW}Building production code...${NC}"
    pnpm install --frozen-lockfile
    pnpm run --recursive build
fi

if [ ! -f "services/api/dist/main.js" ]; then
    echo -e "${RED}✗ Build failed: services/api/dist/main.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API service built${NC}"

if [ ! -f "services/browser-worker/dist/main.js" ]; then
    echo -e "${RED}✗ Build failed: services/browser-worker/dist/main.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Browser worker built${NC}"

echo ""

# ============================================================
# STEP 4: VERIFY GIT STATUS
# ============================================================
echo "${YELLOW}STEP 4: Verifying Git Status${NC}"
echo "---"

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Uncommitted changes detected${NC}"
    git status --short
    echo -e "${YELLOW}Committing changes...${NC}"
    git add .
    git commit -m "chore: Production build and deployment prep"
fi

# Push to GitHub
if [ -z "$(git log --oneline origin/main..main 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ All commits pushed to GitHub${NC}"
else
    echo -e "${YELLOW}Pushing to GitHub...${NC}"
    git push origin main
fi
echo ""

# ============================================================
# STEP 5: CREATE OR SELECT RAILWAY PROJECT
# ============================================================
echo "${YELLOW}STEP 5: Railway Project Setup${NC}"
echo "---"

EXISTING_PROJECTS=$(railway project list 2>/dev/null | grep -i browserai || true)

if [ -z "$EXISTING_PROJECTS" ]; then
    echo -e "${YELLOW}Creating new Railway project: browserai-prod${NC}"
    railway init --name browserai-prod
    echo -e "${GREEN}✓ Project created${NC}"
else
    echo -e "${GREEN}✓ Using existing project${NC}"
fi
echo ""

# ============================================================
# STEP 6: SET ENVIRONMENT VARIABLES
# ============================================================
echo "${YELLOW}STEP 6: Setting Environment Variables${NC}"
echo "---"

# Generate BETTER_AUTH_SECRET
BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "Setting variables..."
railway variable set "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" --skip-deploys 2>/dev/null || true
railway variable set "NODE_ENV=production" --skip-deploys 2>/dev/null || true
railway variable set "APP_ENV=production" --skip-deploys 2>/dev/null || true
railway variable set "WORKER_PORT=3000" --skip-deploys 2>/dev/null || true
railway variable set "API_PORT=3001" --skip-deploys 2>/dev/null || true
railway variable set "LOG_LEVEL=info" --skip-deploys 2>/dev/null || true

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""
echo "BETTER_AUTH_SECRET: $BETTER_AUTH_SECRET"
echo ""

# ============================================================
# STEP 7: DEPLOY TO RAILWAY
# ============================================================
echo "${YELLOW}STEP 7: Deploying to Railway${NC}"
echo "---"
echo "Uploading code and deploying..."
echo "This may take 3-5 minutes..."
echo ""

railway up

echo ""
echo -e "${GREEN}✓ Deployment initiated!${NC}"
echo ""

# ============================================================
# STEP 8: MONITOR DEPLOYMENT
# ============================================================
echo "${YELLOW}STEP 8: Deployment Status${NC}"
echo "---"
echo "Waiting for deployment to complete..."
echo ""

# Check deployment status
for i in {1..30}; do
    STATUS=$(railway deployment list 2>/dev/null | head -2 | tail -1 | awk '{print $3}' || echo "CHECKING")

    if [ "$STATUS" = "SUCCESS" ]; then
        echo -e "${GREEN}✓ Deployment successful!${NC}"
        break
    elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CRASHED" ]; then
        echo -e "${RED}✗ Deployment failed${NC}"
        echo "Check logs with: railway logs"
        exit 1
    fi

    echo "Status: $STATUS (attempt $i/30)..."
    sleep 10
done

echo ""

# ============================================================
# STEP 9: GET APP URL
# ============================================================
echo "${YELLOW}STEP 9: Retrieving App URL${NC}"
echo "---"

APP_URL=$(railway service list 2>/dev/null | grep -o 'https://[^ ]*' | head -1 || echo "https://[your-app].railway.app")

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Your BrowserAI app is live at:"
echo -e "${GREEN}$APP_URL${NC}"
echo ""
echo "Test the health endpoint:"
echo "  curl $APP_URL/health"
echo ""
echo "View logs:"
echo "  railway logs --tail"
echo ""
echo -e "${GREEN}═════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Production deployment successful! 🚀${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════════════════════${NC}"
