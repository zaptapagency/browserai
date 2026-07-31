# BrowserAI — Heroku Deployment Guide

Deploy BrowserAI to Heroku in 5 minutes using the Heroku CLI.

---

## 📋 Prerequisites

- Heroku account ([sign up free](https://signup.heroku.com/))
- Heroku CLI installed (`npm install -g heroku`)
- Git repository (already done)

---

## 🚀 Deployment Steps

### 1. Install Heroku CLI

```bash
npm install -g heroku
```

Or download from: https://devcenter.heroku.com/articles/heroku-cli

### 2. Login to Heroku

```bash
heroku login
```

Follow the browser prompts to authenticate.

### 3. Create Heroku App

```bash
heroku create browserai-production
```

Replace `browserai-production` with your desired app name (must be unique).

**Expected output:**
```
Creating ⬢ browserai-production... done
https://browserai-production.herokuapp.com/ | https://git.heroku.com/browserai-production.git
```

### 4. Add Databases

**PostgreSQL:**
```bash
heroku addons:create heroku-postgresql:standard-0 --app browserai-production
```

**Redis:**
```bash
heroku addons:create heroku-redis:premium-0 --app browserai-production
```

Wait for both to finish provisioning (1-2 minutes).

### 5. Set Environment Variables

Generate BETTER_AUTH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set environment variables:
```bash
heroku config:set \
  BETTER_AUTH_SECRET="<paste-generated-string-here>" \
  NODE_ENV=production \
  APP_ENV=production \
  WORKER_PORT=3000 \
  API_PORT=3001 \
  WORKER_MAX_SESSIONS=5 \
  --app browserai-production
```

Verify:
```bash
heroku config --app browserai-production
```

### 6. Add Procfile

Heroku needs a Procfile to know how to run your app.

Create file: `Procfile`

```procfile
web: node services/api/dist/main.js
worker: node services/browser-worker/dist/main.js
```

Commit it:
```bash
git add Procfile
git commit -m "add: Procfile for Heroku deployment"
```

### 7. Deploy to Heroku

```bash
git push heroku main
```

This will:
- Upload your code to Heroku
- Install dependencies
- Build the application
- Start the dyno

**Watch the logs as it builds:**
```
Compiling Node.js app
Installing dependencies
Building application
...
Launching... done
```

### 8. Verify Deployment

```bash
# Check if app is running
heroku ps --app browserai-production

# Should show:
# web.1: up (just now)
# worker.1: up (just now)
```

### 9. Test the Application

```bash
# API health check
curl https://browserai-production.herokuapp.com/health

# Should return:
# {"status":"ok","version":"0.1.0"}
```

Or open in browser: `https://browserai-production.herokuapp.com/`

---

## 🔄 Managing Your Deployment

### View Logs

```bash
# Real-time logs
heroku logs --tail --app browserai-production

# Last 100 lines
heroku logs -n 100 --app browserai-production
```

### Restart Application

```bash
heroku restart --app browserai-production
```

### Scale Dynos

```bash
# Increase to 2 web dynos
heroku ps:scale web=2 --app browserai-production

# Increase to 2 worker dynos
heroku ps:scale worker=2 --app browserai-production
```

### Update Environment Variables

```bash
# Set a variable
heroku config:set NODE_ENV=production --app browserai-production

# View all
heroku config --app browserai-production

# Remove a variable
heroku config:unset LOG_LEVEL --app browserai-production
```

### Access Database

**PostgreSQL:**
```bash
# Connect with psql
heroku pg:psql --app browserai-production

# Run migrations
heroku run "pnpm run --filter @browserai/db run migrate" --app browserai-production
```

**Redis:**
```bash
# Check Redis
heroku redis:info --app browserai-production
```

### Update Code

After making changes to your code:

```bash
# Commit changes
git add .
git commit -m "feat: your feature description"

# Push to Heroku
git push heroku main

# Check logs
heroku logs --tail --app browserai-production
```

---

## 📊 Monitoring

### View Metrics

```bash
# CPU and memory usage
heroku ps --app browserai-production

# Metrics dashboard
heroku addons:open newrelic:wayne --app browserai-production
```

### Application Errors

If you see errors in logs:

```bash
# Check specific error
heroku logs --app browserai-production | grep ERROR
```

Common issues:
- `Module not found` → Dependencies not installed
- `ECONNREFUSED` → Database connection failed
- `Out of memory` → Increase dyno size

### Uptime Monitoring

Heroku automatically monitors your app. To add external monitoring:

```bash
# Enable Heroku Metrics (free)
heroku addons:create log-shuttle --app browserai-production
```

---

## 💰 Cost Management

### Reduce Costs

1. **Use eco dynos** ($5/month each, but sleezy)
   ```bash
   heroku ps:type eco --app browserai-production
   ```

2. **Scale down non-peak hours**
   ```bash
   heroku ps:scale web=1 worker=1 --app browserai-production
   ```

3. **Choose smaller database**
   ```bash
   heroku addons:destroy heroku-postgresql:standard-0
   heroku addons:create heroku-postgresql:hobby-basic
   ```

### Cost Breakdown

| Component | Free Tier | Paid Tier | Cost |
|-----------|-----------|-----------|------|
| Dynos | 1 (sleeps) | 2+ | $7-50/month |
| PostgreSQL | 10k rows | Unlimited | $9-50/month |
| Redis | - | Paid only | $30+/month |
| **Total** | **$0** | **$50+/month** |

---

## 🆘 Troubleshooting

### App keeps crashing

```bash
# Check logs
heroku logs --tail --app browserai-production

# Look for ERROR lines
# Common: ECONNREFUSED (database), Module not found, Out of memory
```

### Deployment fails

```bash
# View build logs
heroku logs --source build --app browserai-production

# Common: pnpm not found, wrong build command
```

### Database not connecting

```bash
# Get connection string
heroku config:get DATABASE_URL --app browserai-production

# Verify it's set in environment
heroku config --app browserai-production
```

### High memory usage

```bash
# Increase dyno size
heroku ps:type standard-1x --app browserai-production

# OR reduce worker sessions
heroku config:set WORKER_MAX_SESSIONS=3 --app browserai-production
```

---

## 🔐 Security

- [ ] HTTPS enabled (automatic)
- [ ] BETTER_AUTH_SECRET is strong random value
- [ ] Database credentials not in code
- [ ] Environment variables set (not in git)
- [ ] Enable backups for PostgreSQL:
  ```bash
  heroku addons:create heroku-postgresql:standard-0 --app browserai-production
  heroku pg:backups --app browserai-production
  ```

---

## 🎉 Deployment Complete!

Your app is now live at: `https://browserai-production.herokuapp.com/`

(Replace `browserai-production` with your actual app name)

---

## 📚 Next Steps

1. **Monitor**: `heroku logs --tail --app browserai-production`
2. **Test**: Visit `https://your-app-name.herokuapp.com/health`
3. **Configure**: Set up environment variables as needed
4. **Scale**: Add more dynos if needed
5. **Update**: Push new code with `git push heroku main`

---

## 📞 Support

- Heroku Docs: https://devcenter.heroku.com/
- BrowserAI Docs: See [README.md](./README.md)
- Issues: [github.com/zaptapagency/browserai/issues](https://github.com/zaptapagency/browserai/issues)

---

**Built with ❤️ by Claude Code**
