# BrowserAI Railway Deployment Guide

Complete step-by-step guide for deploying BrowserAI to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: Repository must be on GitHub
3. **GitHub Token** (optional but recommended): For private repos
4. **Database**: Railway PostgreSQL add-on will be auto-provisioned
5. **Redis**: Railway Redis add-on will be auto-provisioned
6. **S3 Storage**: MinIO add-on or external S3-compatible service

## Quick Start (5 minutes)

### 1. Connect Repository to Railway

```bash
# Push code to GitHub if not already done
git push origin main
```

### 2. Deploy via Railway Dashboard

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Select your BrowserAI repository
5. Railway will automatically:
   - Detect `railway.json`
   - Build using Nixpacks
   - Deploy services

### 3. Configure Environment Variables

Railway automatically exposes these via add-ons:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)

Add these manually via Railway Dashboard **Variables** tab:

```env
# Authentication
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars

# Application
APP_ENV=production
LOG_LEVEL=info
WORKER_PORT=3000
API_PORT=3001
WORKER_MAX_SESSIONS=10
WORKER_SESSION_TTL_MS=3600000

# Browser Automation
ENABLE_REAL_PROXY_PROVIDER=false
PROXY_PROVIDER_TYPE=mock
ENABLE_REAL_CAPTCHA_SOLVER=false
CAPTCHA_SOLVER_TYPE=mock

# Storage (S3-compatible or AWS S3)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
S3_BUCKET=browserai-artifacts
S3_USE_PATH_STYLE=false

# Email (optional)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@browserai.local
```

### 4. Add Required Services

#### PostgreSQL Add-on

1. In Railway Dashboard, click **"Add Service"** → **"Add Database"**
2. Select **PostgreSQL**
3. Railway auto-links to `DATABASE_URL`

#### Redis Add-on

1. Click **"Add Service"** → **"Add Database"**
2. Select **Redis**
3. Railway auto-links to `REDIS_URL`

#### S3 Bucket (AWS)

1. Create AWS S3 bucket at [console.aws.amazon.com/s3](https://console.aws.amazon.com/s3)
2. Generate access key via IAM
3. Set `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` in Railway

### 5. Database Migrations

Railway runs migrations automatically on every deployment:

```bash
# To manually run migrations in production
railway run pnpm --filter @browserai/db run migrate
```

### 6. Verify Deployment

Check logs in Railway Dashboard:

```bash
# View logs
railway logs

# Or via Dashboard → "Logs" tab
```

Expected output:
```
🌐 API server ready on http://localhost:3001
🌐 Browser worker ready on http://localhost:3000
```

## Deployment Verification Checklist

- [ ] Application builds without errors
- [ ] All environment variables set
- [ ] Database migrations completed
- [ ] API responding on `/health`
- [ ] WebSocket connections working
- [ ] Database queries executing
- [ ] Redis connectivity confirmed
- [ ] S3 uploads working

## Accessing Your Deployment

- **API**: `https://your-project.up.railway.app/api`
- **Web Dashboard**: `https://your-project.up.railway.app`
- **Health Check**: `https://your-project.up.railway.app/api/health`

## Troubleshooting

### Build Failures

**Error**: `"Cannot find module"`
- **Solution**: Ensure `pnpm-lock.yaml` is committed
  ```bash
  git add pnpm-lock.yaml && git commit -m "Lock dependencies"
  ```

**Error**: `"TypeScript compilation failed"`
- **Solution**: Check logs and fix locally
  ```bash
  pnpm run --recursive build
  ```

### Runtime Errors

**Error**: `"DATABASE_URL not found"`
- **Solution**: Add PostgreSQL add-on and ensure `DATABASE_URL` is in Variables

**Error**: `"REDIS connection failed"`
- **Solution**: Add Redis add-on and verify `REDIS_URL` environment variable

**Error**: `"S3 authentication failed"`
- **Solution**: Verify AWS credentials and bucket permissions

### Performance Issues

**High Memory Usage**:
- Increase Railway plan memory
- Reduce `WORKER_MAX_SESSIONS`

**Slow API Responses**:
- Check database connection pooling
- Monitor Redis cache hit rate
- Scale up horizontal replicas

## Production Configuration

### Security Best Practices

1. **Rotate Secrets**:
   ```bash
   # Generate new JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Enable HTTPS**: Railway auto-provides SSL

3. **Rate Limiting**: Configure in `packages/config/src/env.ts`

4. **CORS**: Set allowed origins in API service

### Monitoring & Logs

- Railway Dashboard shows real-time logs
- Set up alerts for service failures
- Monitor database connection usage
- Track S3 storage costs

### Scaling

Railway supports horizontal scaling:

1. Go to **Service Settings**
2. Increase **"Number of Instances"**
3. Configure load balancing

For vertical scaling:
1. Upgrade Railway plan
2. Services auto-restart with more resources

## Rollback Procedure

To rollback to previous version:

```bash
# View deployment history
railway history

# Rollback to previous deployment
railway rollback <deployment-id>
```

Or via Dashboard → **"Deployments"** tab

## Database Backups

Railway automatically backs up PostgreSQL. To restore:

1. Go to **Plugins** → **PostgreSQL**
2. Click **"Backups"** tab
3. Select backup and click **"Restore"**

## Cost Optimization

- **Shutdown unused services**: Stop browser-worker if only using API
- **Use spot pricing**: Enable for development/staging
- **Monitor resource usage**: Adjust limits in `railway.json`
- **Cache aggressively**: Increase Redis TTL values

## Support & Debugging

### Enable Debug Logging

Set in Railway Variables:
```env
LOG_LEVEL=debug
DEBUG=*
```

### View Detailed Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View real-time logs
railway logs --follow
```

### Contact Support

- **Railway Support**: https://railway.app/support
- **BrowserAI Issues**: GitHub issues
- **Discord Community**: [Discord link]

## Next Steps

1. ✅ Deployment complete
2. **Configure domain**: Add custom domain in Railway settings
3. **Setup monitoring**: Connect Sentry, DataDog, or similar
4. **Load testing**: Use k6 or similar tools
5. **Team access**: Invite teammates to Railway project
