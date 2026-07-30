# BrowserAI — DigitalOcean App Platform Deployment

Complete guide to deploying BrowserAI on DigitalOcean App Platform in 10 minutes.

---

## 📋 Prerequisites

- DigitalOcean account ([sign up free](https://m.do.co/c/))
- GitHub account with the repository access
- This repository pushed to GitHub

---

## 🚀 Deployment Steps

### 1. Link GitHub Repository

1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com/)
2. Click **Apps** in the left sidebar
3. Click **Create App**
4. Select **GitHub** as source
5. Authorize DigitalOcean to access your GitHub account
6. Select repository: **zaptapagency/browserai**
7. Select branch: **main**
8. Click **Next**

### 2. Configure Services

DigitalOcean will auto-detect the `app.yaml` file and configure:

#### Detected Services:
- **api** - NestJS REST API (port 3001)
- **browser-worker** - Playwright runtime (port 3000)

#### Detected Databases:
- **PostgreSQL 15** - Main database
- **Redis 7** - Cache/queue

✅ Everything should be auto-configured. Click **Next** to continue.

### 3. Configure Environment Variables

Set these required variables in the **Environment** tab:

**Critical (Generate new):**
```
BETTER_AUTH_SECRET = <generate random string>
```

Generate via: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Already Set (via app.yaml):**
```
NODE_ENV = production
APP_ENV = production
WORKER_PORT = 3000
API_PORT = 3001
LOG_LEVEL = info
ENABLE_REAL_PROXY_PROVIDER = false
ENABLE_REAL_CAPTCHA_SOLVER = false
```

**Optional (for production use):**
```
S3_ENDPOINT = https://nyc3.digitaloceanspaces.com
S3_REGION = nyc3
S3_ACCESS_KEY = <your-key>
S3_SECRET_KEY = <your-secret>
S3_BUCKET = browserai-prod
S3_USE_PATH_STYLE = false

STRIPE_SECRET_KEY = sk_live_...
STRIPE_PUBLISHABLE_KEY = pk_live_...
```

Click **Next** to continue.

### 4. Review & Deploy

1. Review the configuration
2. Choose your app name (e.g., `browserai-production`)
3. Select region (recommended: closest to you)
4. Click **Create Resources**

DigitalOcean will:
- ✅ Provision PostgreSQL database
- ✅ Provision Redis cache
- ✅ Build Docker image from Dockerfile
- ✅ Deploy API service
- ✅ Deploy Browser Worker service
- ✅ Configure networking & SSL

**Build time: ~3-5 minutes**

---

## ✅ Verify Deployment

### 1. Check Deployment Status

In DigitalOcean Dashboard:
- Go to **Apps** → Your app
- Wait for all services to show **Running** (green)
- Check the **Live Log** for any errors

### 2. Test API Health

Once deployed, click **Visit App** to get your domain:

```bash
# Replace YOUR_APP_DOMAIN with actual domain
curl https://YOUR_APP_DOMAIN/health

# Expected response:
# {"status":"ok","version":"0.1.0"}
```

### 3. Test Browser Worker

```bash
curl https://YOUR_APP_DOMAIN/internal/health

# Expected response:
# {"status":"ok","active_sessions":0}
```

### 4. Access Dashboard

Open browser to `https://YOUR_APP_DOMAIN/`

You should see the BrowserAI landing page.

---

## 🔧 Managing Your Deployment

### View Logs

**API Logs:**
1. Apps → Your app → **API** service
2. Click **Live Log** tab
3. Real-time logs appear

**Browser Worker Logs:**
1. Apps → Your app → **Browser Worker** service
2. Click **Live Log** tab

### Update Environment Variables

1. Apps → Your app → **Settings**
2. Scroll to **Environment**
3. Edit any variable
4. Click **Save**
5. Services redeploy automatically

### Scale Services

1. Apps → Your app → **Settings**
2. Scroll to **Resources**
3. Adjust CPU/Memory as needed
4. Click **Update**

### Access Database

**PostgreSQL:**
1. Apps → Your app → **Database** tab
2. Click connection string to copy
3. Use with `psql` or any PostgreSQL client

**Redis:**
1. Apps → Your app → **Database** tab
2. Click Redis connection string
3. Use with `redis-cli`

---

## 📊 Monitoring

### CPU & Memory Usage

1. Apps → Your app → **Metrics** tab
2. View real-time CPU, memory, network stats

### Error Tracking

Check logs for:
```
ERROR [NestApplication]
ERR_
Cannot find module
```

If you see errors:
1. Check environment variables are set correctly
2. Verify DATABASE_URL and REDIS_URL are connected
3. Check app.yaml is committed to main branch
4. Redeploy from dashboard if needed

---

## 🔐 Security Checklist

- [ ] Set strong `BETTER_AUTH_SECRET` (32+ random chars)
- [ ] Use HTTPS only (DigitalOcean auto-provides SSL)
- [ ] Configure database backups in DigitalOcean
- [ ] Set resource limits appropriately
- [ ] Enable audit logging for sensitive operations
- [ ] Review and rotate API keys regularly

---

## 💰 Estimated Costs

| Component | Cost/Month | Notes |
|-----------|-----------|-------|
| App Platform (API + Worker) | $12-24 | Basic plan sufficient |
| PostgreSQL (2GB) | $15 | Auto-backups included |
| Redis (1GB) | $15 | Managed service |
| **Total** | **~$42-54** | Scale as needed |

---

## 🆘 Troubleshooting

### Service won't start

**Error:** `Cannot find module '@nestjs/core'`

**Solution:**
1. Check `app.yaml` build_command is correct
2. Verify `pnpm-lock.yaml` is committed to git
3. Redeploy from dashboard

### Database connection timeout

**Solution:**
1. Check DATABASE_URL is set
2. Verify PostgreSQL add-on is running
3. Check firewall allows outbound connections
4. Restart services in dashboard

### High memory usage

**Solution:**
1. Reduce `WORKER_MAX_SESSIONS` in environment
2. Increase app memory allocation in settings
3. Check for memory leaks in logs

### Build taking too long

**Solution:**
1. First build takes ~5 minutes (builds dependencies)
2. Subsequent builds are faster (uses cache)
3. Check Live Log for actual build status

---

## 📚 Next Steps

1. **Monitor deployment** - Watch Live Log for first 30 seconds
2. **Test endpoints** - Verify health checks are responding
3. **Check logs** - Look for any warnings or errors
4. **Scale if needed** - Increase resources if usage is high
5. **Set up backups** - Configure database backups in DigitalOcean

---

## 🎉 Deployment Complete!

Your BrowserAI application is now running on DigitalOcean App Platform.

**Your app URL:** `https://YOUR_APP_NAME.ondigitalocean.app`

---

## 📞 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **BrowserAI Docs**: See [README.md](./README.md)
- **Issues**: [github.com/zaptapagency/browserai/issues](https://github.com/zaptapagency/browserai/issues)

---

**Built with ❤️ by Claude Code**
