# BrowserAI — Complete Deployment Guide

**Status**: Production-ready. Choose your deployment platform below.

---

## 📊 Platform Comparison

| Platform | Setup Time | Cost | Best For | Docs |
|----------|-----------|------|----------|------|
| **DigitalOcean App Platform** | 10 min | $42-54/mo | Recommended - best pnpm support | [Guide](./DIGITALOCEAN_DEPLOYMENT.md) |
| **Heroku** | 5 min | $7-50/mo | Quick deployment, simple apps | [Guide](./HEROKU_DEPLOYMENT.md) |
| **Railway** | 5 min | $5+/mo | Pay-per-use, developer-friendly | [Guide](./RAILWAY_DEPLOYMENT.md) |
| **Self-Hosted (Docker)** | 20 min | Variable | Full control, cost-effective at scale | [Guide](./SELF_HOSTED_DEPLOYMENT.md) |

---

## 🚀 Quick Start — DigitalOcean (Recommended)

### 1. Navigate to DigitalOcean Dashboard

Go to: https://cloud.digitalocean.com/

### 2. Create New App

- Click **Apps** (left sidebar)
- Click **Create App**
- Select **GitHub** as source

### 3. Connect Repository

- Click **Authorize GitHub**
- Select repository: **zaptapagency/browserai**
- Select branch: **main**
- Click **Next**

### 4. Review Configuration

DigitalOcean will auto-detect `app.yaml`:
- ✅ API service (NestJS, port 3001)
- ✅ Browser Worker (Playwright, port 3000)
- ✅ PostgreSQL 15 database
- ✅ Redis 7 cache

Click **Next** to continue.

### 5. Configure Environment

Add this required variable:

**BETTER_AUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and set it in DigitalOcean.

Click **Next**.

### 6. Deploy

- Review configuration
- Name your app (e.g., `browserai-production`)
- Select region (recommend: closest to your users)
- Click **Create Resources**

**Wait 3-5 minutes for deployment to complete.**

### 7. Verify

Once all services show **Running** (green):

1. Click **Visit App** to get your URL
2. Test the health endpoint:
   ```bash
   curl https://your-app-name.ondigitalocean.app/health
   ```
3. You should see:
   ```json
   {"status":"ok","version":"0.1.0"}
   ```

✅ **Deployment Complete!**

---

## 🔄 Alternative: Heroku (Fastest)

### Setup (5 minutes)

```bash
# 1. Install Heroku CLI
npm install -g heroku

# 2. Login to Heroku
heroku login

# 3. Create app
heroku create browserai-prod

# 4. Add databases
heroku addons:create heroku-postgresql:standard-0 --app browserai-prod
heroku addons:create heroku-redis:premium-0 --app browserai-prod

# 5. Set environment variables
heroku config:set BETTER_AUTH_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" --app browserai-prod
heroku config:set NODE_ENV=production --app browserai-prod
heroku config:set APP_ENV=production --app browserai-prod

# 6. Deploy
git push heroku main

# 7. Check logs
heroku logs --tail --app browserai-prod
```

---

## 🐳 Self-Hosted Deployment (Docker)

Perfect if you have your own server or cloud instance.

### Prerequisites

- Server with Docker installed (Ubuntu, CentOS, etc.)
- 2GB RAM minimum
- PostgreSQL and Redis access

### Deploy

```bash
# 1. Clone repository
git clone https://github.com/zaptapagency/browserai.git
cd browserai

# 2. Build Docker image
docker build -t browserai:latest .

# 3. Create .env file
cat > .env << EOF
NODE_ENV=production
APP_ENV=production
DATABASE_URL=postgresql://user:password@postgres-host:5432/browserai
REDIS_URL=redis://user:password@redis-host:6379
BETTER_AUTH_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
WORKER_PORT=3000
API_PORT=3001
EOF

# 4. Run with docker-compose
docker-compose up -d

# 5. Verify
curl http://localhost:3001/health
```

---

## 📋 Pre-Deployment Checklist

- [ ] Repository pushed to GitHub: zaptapagency/browserai
- [ ] All tests passing locally: `pnpm run --recursive test`
- [ ] Build succeeds locally: `pnpm run --recursive build`
- [ ] Environment variables configured for chosen platform
- [ ] Database credentials/connection strings ready
- [ ] BETTER_AUTH_SECRET generated (32+ random characters)

---

## ✅ Post-Deployment Verification

### 1. Health Checks

**API Health:**
```bash
curl https://your-app-url/health
# Should return: {"status":"ok","version":"0.1.0"}
```

**Worker Health:**
```bash
curl https://your-app-url/internal/health
# Should return: {"status":"ok","active_sessions":0}
```

### 2. Check Logs

**DigitalOcean:**
- Apps → Your App → Live Log tab

**Heroku:**
```bash
heroku logs --tail --app browserai-prod
```

**Self-Hosted:**
```bash
docker logs browserai-api
docker logs browserai-worker
```

### 3. Database Connectivity

Verify PostgreSQL and Redis are connected:
- Check logs for connection errors
- No `ECONNREFUSED` errors should appear

---

## 🔐 Security Checklist

After deployment:

- [ ] HTTPS/SSL working (auto-enabled on DigitalOcean/Heroku)
- [ ] BETTER_AUTH_SECRET set to strong random value
- [ ] Environment variables not exposed in logs
- [ ] Database backups configured
- [ ] Monitor resource usage (CPU/memory)
- [ ] Set up error logging/monitoring

---

## 📊 Cost Summary

### DigitalOcean App Platform (Recommended)
- App Platform: $12-24/month
- PostgreSQL: $15/month
- Redis: $15/month
- **Total: ~$42-54/month**

### Heroku
- Dynos: $7-50/month (depending on size)
- PostgreSQL: Included in add-on
- Redis: Included in add-on
- **Total: ~$10-50/month**

### Railway
- Auto-scales based on usage
- $5/month minimum
- **Total: $5+/month** (very cost-effective for low traffic)

### Self-Hosted
- VPS: $5-20/month (DigitalOcean, AWS, Linode)
- Database hosting: $0 (self-hosted) or $10-30/month
- **Total: $5-50/month**

---

## 🆘 Troubleshooting

### "Cannot find module '@nestjs/core'"

**Cause:** Dependencies not installed in production container

**Solution:**
1. Ensure `pnpm-lock.yaml` is committed to git
2. Redeploy from dashboard
3. Check build logs for pnpm errors

### Database Connection Timeout

**Cause:** Database not accessible from app

**Solution:**
1. Verify DATABASE_URL is correct
2. Check database is running/accessible
3. Verify firewall allows outbound connections
4. Restart services

### High Memory Usage

**Solution:**
1. Increase app memory allocation in settings
2. Reduce `WORKER_MAX_SESSIONS` environment variable
3. Check logs for memory leaks

---

## 📚 Full Documentation

- **Quick Start**: See [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Architecture**: See [README.md](./README.md)
- **DigitalOcean Details**: See [DIGITALOCEAN_DEPLOYMENT.md](./DIGITALOCEAN_DEPLOYMENT.md)
- **Railway Details**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

---

## 🎉 You're Ready to Deploy!

Choose your platform above and follow the 5-10 minute setup process.

**Recommended**: Start with DigitalOcean App Platform (best pnpm monorepo support).

---

**Questions?** Check logs on your platform's dashboard or review the detailed guides above.

**Built with ❤️ by Claude Code**
