# BrowserAI — Self-Hosted Deployment Guide

Complete guide to deploying BrowserAI on your own server using Docker Compose.

---

## 📋 Prerequisites

### Server Requirements

- **OS**: Ubuntu 22.04 LTS or newer (or equivalent Linux)
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB free space
- **CPU**: 1 core minimum (2+ cores recommended)
- **Network**: Public IP or domain name

### Software Requirements

- Docker (20.10+)
- Docker Compose (2.0+)
- Git

### Recommended Providers

- DigitalOcean Droplets ($5-20/month)
- Linode ($5-20/month)
- AWS EC2 t2.micro (free tier available)
- Vultr ($2.50+/month)
- Hetzner Cloud (~$3/month)

---

## 🚀 Installation Steps

### 1. Launch Server

**DigitalOcean Example:**
```bash
# Create droplet
# - OS: Ubuntu 22.04 x64
# - Size: Basic $5/month (1 GB RAM, 25 GB SSD)
# - Region: Closest to you
# - Enable IPv6
```

SSH into your server:
```bash
ssh root@your-server-ip
```

### 2. Install Docker

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin

# Enable Docker service
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
docker compose version
```

### 3. Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/zaptapagency/browserai.git
cd browserai
```

### 4. Create Environment File

```bash
# Create .env file
cat > .env << 'EOF'
# Node environment
NODE_ENV=production
APP_ENV=production

# Ports
WORKER_PORT=3000
API_PORT=3001

# Database
DATABASE_URL=postgresql://browserai:password123@postgres:5432/browserai

# Redis
REDIS_URL=redis://redis:6379

# Authentication Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
BETTER_AUTH_SECRET=your-secret-here-replace-this

# Logging
LOG_LEVEL=info

# Worker Configuration
WORKER_MAX_SESSIONS=10
WORKER_SESSION_TTL_MS=3600000

# Feature Flags (set to 'false' for mock implementations)
ENABLE_REAL_PROXY_PROVIDER=false
PROXY_PROVIDER_TYPE=mock
ENABLE_REAL_CAPTCHA_SOLVER=false
CAPTCHA_SOLVER_TYPE=mock
EOF
```

**Generate BETTER_AUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `your-secret-here-replace-this` in the .env file.

### 5. Build Docker Images

```bash
# Build the application image
docker compose build

# This will:
# - Install dependencies
# - Compile TypeScript
# - Build the application
# - Create optimized Docker image
```

### 6. Start Services

```bash
# Start all services in background
docker compose up -d

# This starts:
# - PostgreSQL database
# - Redis cache
# - API service (port 3001)
# - Browser Worker service (port 3000)

# Watch the logs
docker compose logs -f

# Press Ctrl+C to exit logs
```

### 7. Initialize Database

```bash
# Run database migrations
docker compose exec api pnpm run --filter @browserai/db run migrate

# Seed database (optional)
docker compose exec api pnpm run --filter @browserai/db run seed
```

### 8. Verify Services

```bash
# Check status of all services
docker compose ps

# Should show all containers RUNNING

# Test API health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","version":"0.1.0"}
```

---

## 🌐 Configure Domain & HTTPS

### Option 1: Using Caddy (Automatic HTTPS)

Caddy automatically configures HTTPS with Let's Encrypt certificates.

**Create Caddyfile:**
```bash
cat > /home/browserai/Caddyfile << 'EOF'
your-domain.com {
  reverse_proxy localhost:3001
}
EOF
```

**Install and run Caddy:**
```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl https://dl.filippo.io/caddy/debian/caddy.gpg.key | apt-key add -
apt update
apt install caddy

# Update Caddyfile
sudo systemctl edit --force --full caddy

# Start Caddy
systemctl start caddy
systemctl enable caddy

# Check status
systemctl status caddy
```

### Option 2: Using Nginx + Let's Encrypt

```bash
# Install Nginx
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/browserai << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/browserai /etc/nginx/sites-enabled/

# Get SSL certificate
certbot --nginx -d your-domain.com

# Test Nginx
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### Option 3: No HTTPS (Not Recommended for Production)

If you just want to test, access directly:
```bash
# API: http://server-ip:3001
# Worker: http://server-ip:3000
```

---

## 🔄 Managing Your Deployment

### View Logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs -f api
docker compose logs -f browser-worker
docker compose logs -f postgres

# Last 50 lines
docker compose logs --tail 50
```

### Stop/Start Services

```bash
# Stop all services
docker compose stop

# Start all services
docker compose start

# Restart all services
docker compose restart

# Restart specific service
docker compose restart api
```

### Update Code

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose build

# Restart services
docker compose up -d
```

### Access Database

```bash
# PostgreSQL shell
docker compose exec postgres psql -U browserai -d browserai

# Redis CLI
docker compose exec redis redis-cli
```

---

## 📊 Monitoring & Maintenance

### Check Resource Usage

```bash
# Docker stats
docker stats

# System resources
free -h    # Memory
df -h      # Disk space
top        # CPU usage
```

### Database Backups

**Manual backup:**
```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U browserai browserai > backup-$(date +%Y%m%d).sql

# Restore backup
docker compose exec postgres psql -U browserai browserai < backup-20240101.sql
```

**Automated backup script:**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/home/browserai/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f /home/browserai/docker-compose.yml exec postgres \
  pg_dump -U browserai browserai \
  > $BACKUP_DIR/postgres-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/postgres-$DATE.sql"
```

Add to crontab for automated backups:
```bash
# Run daily at 2 AM
crontab -e

# Add line:
0 2 * * * /home/browserai/backup.sh
```

### Monitor Disk Space

```bash
# Check disk usage
df -h /

# If running low:
# 1. Prune Docker images: docker image prune
# 2. Remove old logs: docker logs --tail 0
# 3. Expand volume on your provider
```

---

## 🔐 Security Hardening

### 1. Firewall Configuration

```bash
# Enable firewall
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block other ports
ufw deny 3001
ufw deny 3000

# Check status
ufw status
```

### 2. SSH Security

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Recommended changes:
# - PermitRootLogin no
# - PasswordAuthentication no
# - PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

### 3. Environment Security

```bash
# Restrict .env permissions
chmod 600 .env

# Don't commit .env to git
echo ".env" >> .gitignore
```

### 4. Docker Security

```bash
# Don't run containers as root
# (Already done in Dockerfile)

# Limit container resources
# Edit docker-compose.yml and add:
# services:
#   api:
#     deploy:
#       resources:
#         limits:
#           cpus: '0.5'
#           memory: 512M
```

### 5. HTTPS/SSL

```bash
# Auto-renew certificates
systemctl enable certbot.timer
systemctl start certbot.timer
```

---

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs api

# Common issues:
# - PORT_ALREADY_IN_USE → Change ports in docker-compose.yml
# - DATABASE_CONNECTION_ERROR → Check postgres is running
# - OUT_OF_MEMORY → Increase server memory or reduce WORKER_MAX_SESSIONS
```

### Database connection fails

```bash
# Verify postgres is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Verify DATABASE_URL format:
# postgresql://user:password@host:5432/database
```

### High CPU/Memory usage

```bash
# Check which container is using resources
docker stats

# Reduce workers
docker compose exec api \
  sh -c 'sed -i "s/WORKER_MAX_SESSIONS=10/WORKER_MAX_SESSIONS=5/" .env'

# Restart
docker compose restart
```

### SSL certificate errors

```bash
# Renew certificate manually
certbot renew --force-renewal

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

---

## 📈 Scaling Your Deployment

### Run Multiple API Instances

Edit `docker-compose.yml`:
```yaml
services:
  api:
    # ...
  api2:
    image: browserai:latest
    container_name: browserai_api2
    ports:
      - "3002:3001"
    # ... rest of config
```

Use load balancer (Nginx/Caddy) to route between them.

### Increase Database Resources

```bash
# Check current settings
docker compose exec postgres psql -U browserai -d browserai -c "SHOW max_connections;"

# Scale up the droplet/instance to add more RAM/CPU
# (Varies by provider)
```

---

## 🎉 Your Deployment is Complete!

Access your application:
- **Web UI**: https://your-domain.com/
- **API Health**: https://your-domain.com/health
- **Worker Health**: https://your-domain.com/internal/health

---

## 📚 Next Steps

1. **Monitor**: `docker compose logs -f`
2. **Backup**: Set up automated daily backups
3. **Update**: `git pull && docker compose build && docker compose up -d`
4. **Scale**: Add more workers/databases as needed
5. **Secure**: Review firewall rules and SSL certificates

---

## 💰 Estimated Costs

| Item | Cost | Notes |
|------|------|-------|
| Server (DigitalOcean $5) | $5/month | 1GB RAM, 1 core |
| Domain | $10-15/year | Optional |
| SSL Certificate | Free | Let's Encrypt |
| **Total** | **~$5-10/month** | Very cost-effective |

---

## 📞 Support

- Docker Docs: https://docs.docker.com/
- BrowserAI Docs: See [README.md](./README.md)
- Issues: [github.com/zaptapagency/browserai/issues](https://github.com/zaptapagency/browserai/issues)

---

**Built with ❤️ by Claude Code**
