# DigitalOcean Deployment — Step-by-Step Instructions

**Ready to deploy BrowserAI to DigitalOcean App Platform**

---

## 🔐 Your Deployment Secret

Save this value — you'll need it during setup:

```
BETTER_AUTH_SECRET=7e71a6be615f34cf565f5231659a309b234f43c241ed765da7ea7ae723b9257a
```

---

## 📋 Prerequisites

- ✅ DigitalOcean account (free $200 credit available at https://m.do.co/c/)
- ✅ GitHub account with access to zaptapagency/browserai
- ✅ This repository: https://github.com/zaptapagency/browserai

---

## 🚀 Complete Deployment Steps

### STEP 1: Navigate to DigitalOcean Dashboard

1. Go to: **https://cloud.digitalocean.com/**
2. Login with your account
3. You'll see the main dashboard

---

### STEP 2: Create New App

1. Click **Apps** in the left sidebar
2. Click blue **Create App** button
3. A dialog will appear

---

### STEP 3: Select GitHub as Source

In the "Choose your source" dialog:

1. Select **GitHub** option
2. Click **Authorize GitHub** (if first time)
   - You'll be redirected to GitHub
   - Click **Authorize DigitalOcean**
   - Confirm authorization
   - You'll return to DigitalOcean

---

### STEP 4: Select Repository

1. In "Select Repository" dropdown, search: **browserai**
2. Select: **zaptapagency/browserai**
3. For branch, select: **main**
4. Click **Next**

---

### STEP 5: Configure Services (Auto-Loads)

DigitalOcean will auto-detect and load `app.yaml`. You should see:

**Services:**
- ✅ API (port 3001)
- ✅ Browser Worker (port 3000)

**Databases:**
- ✅ PostgreSQL 15
- ✅ Redis 7

Everything should already be configured. No changes needed.

✅ Click **Next**

---

### STEP 6: Set Environment Variables

This is the ONLY step where you need to add something.

1. In the "Environment" section, look for the variables table
2. **Add this one variable:**

   | Key | Value |
   |-----|-------|
   | `BETTER_AUTH_SECRET` | `7e71a6be615f34cf565f5231659a309b234f43c241ed765da7ea7ae723b9257a` |

3. Just paste the secret value into the field

**All other variables are already set** (via app.yaml):
- NODE_ENV = production
- APP_ENV = production
- WORKER_PORT = 3000
- API_PORT = 3001
- LOG_LEVEL = info
- ENABLE_REAL_PROXY_PROVIDER = false
- ENABLE_REAL_CAPTCHA_SOLVER = false
- etc.

4. Click **Next**

---

### STEP 7: Review & Deploy

1. **App Name**: Enter your app name
   - Recommended: `browserai-production`
   - (This becomes part of your URL)

2. **Region**: Select closest to your users
   - US: `sfo` (San Francisco), `nyc` (New York)
   - EU: `ams` (Amsterdam), `lon` (London)
   - Asia: `sgp` (Singapore), `blr` (Bangalore)
   - Default: `sfo` is fine

3. Review the configuration summary

4. Click blue **Create Resources** button

---

### STEP 8: Wait for Deployment

DigitalOcean will now:
- Provision PostgreSQL 15 database
- Provision Redis 7 cache
- Build Docker image from your code
- Deploy API service
- Deploy Browser Worker service
- Configure networking & HTTPS

**⏳ This takes 3-5 minutes**

You'll see:
- Services showing "Building" (in progress)
- Then "Deploying" (almost done)
- Then "Running" (green checkmark ✅)

---

### STEP 9: Access Your App

Once all services show **RUNNING** (green):

1. Click **Visit App** button (top right)
2. You'll get your app's public URL:
   ```
   https://browserai-production.ondigitalocean.app
   ```

3. **Test the API:**
   ```bash
   curl https://browserai-production.ondigitalocean.app/health
   ```

   Expected response:
   ```json
   {"status":"ok","version":"0.1.0"}
   ```

4. **Access the Dashboard:**
   ```
   https://browserai-production.ondigitalocean.app/
   ```

✅ **Your app is live!** 🎉

---

## ✅ Post-Deployment Verification

### Check All Services Are Running

In DigitalOcean Dashboard:
1. Apps → Your App Name
2. You should see all services with green "Running" status:
   - ✅ API
   - ✅ Browser Worker
   - ✅ PostgreSQL (database)
   - ✅ Redis (cache)

### Test Health Endpoints

```bash
# API health
curl https://your-app-name.ondigitalocean.app/health
# Response: {"status":"ok","version":"0.1.0"}

# Worker health
curl https://your-app-name.ondigitalocean.app/internal/health
# Response: {"status":"ok","active_sessions":0}
```

### View Logs

In DigitalOcean Dashboard:
1. Apps → Your App
2. Click on each service (API, Browser Worker)
3. Click **Live Log** tab
4. See real-time logs

### If Something Goes Wrong

Check logs for errors. Common issues:
- **Module not found**: Wait for build to complete (takes 5 min)
- **Database connection error**: Check PostgreSQL is running
- **Port already in use**: DigitalOcean handles this automatically

---

## 🔧 Managing Your Deployment

### Update Environment Variables

1. Apps → Your App → **Settings**
2. Scroll to **Environment**
3. Click variable to edit
4. Services auto-redeploy

### View Resource Usage

1. Apps → Your App → **Metrics**
2. See CPU, memory, network usage

### Restart Services

1. Apps → Your App
2. Click service name (API or Browser Worker)
3. Click **Restart** button

### Update Code

1. Make changes locally
2. `git push origin main`
3. DigitalOcean auto-detects and redeploys
4. (You can also manually redeploy from dashboard)

---

## 💰 Pricing

| Component | Cost | Notes |
|-----------|------|-------|
| App Platform | $12-24/month | Scales based on usage |
| PostgreSQL 15 | $15/month | Includes backups |
| Redis 7 | $15/month | Managed service |
| **Total** | **~$42-54/month** | Very reasonable for production |

**Free tier**: $200 credit for first 60 days (usually covers everything)

---

## 🔐 Security Notes

✅ **HTTPS/SSL**: Automatic (DigitalOcean provides free SSL certificates)

✅ **Database**: Managed PostgreSQL with automatic backups

✅ **Secrets**: BETTER_AUTH_SECRET is encrypted and not logged

✅ **Networking**: Services only accessible via HTTPS

To add more security:
1. Enable firewalls in DigitalOcean
2. Configure custom domains
3. Set up monitoring alerts

---

## 📚 Next Steps

After successful deployment:

1. **Monitor**: Check logs regularly
   - Apps → Your App → Live Log

2. **Backup**: DigitalOcean auto-backups databases
   - But you can also manual backup

3. **Scale**: If traffic increases, increase resources
   - Apps → Your App → Settings → Resources

4. **Update**: Push code changes to GitHub
   - DigitalOcean auto-deploys within 1-2 minutes

---

## 🆘 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **BrowserAI Docs**: See [README.md](./README.md)
- **Issues**: https://github.com/zaptapagency/browserai/issues

---

## ✨ Deployment Complete!

Your BrowserAI application is now running on DigitalOcean App Platform.

**Your app URL**: `https://browserai-production.ondigitalocean.app` (or your custom name)

**Time to deployment**: ~10 minutes
**Setup complexity**: Very simple (all auto-configured)
**Ongoing management**: Minimal (managed databases, auto-scaling)

Enjoy! 🚀

---

**Built with ❤️ by Claude Code**
