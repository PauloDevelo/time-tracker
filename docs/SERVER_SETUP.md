# Server Setup Guide

This guide explains how to set up the Debian server for Time Tracker deployment.

## Prerequisites

- Debian 11/12 server with root access
- Domain `timetracker.snpdnd.com` pointing to your server's IP
- SSH access to the server

## 1. Initial Server Setup

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential
```

## 2. Install Node.js 20

```bash
# Install Node.js 20.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

## 3. Install MongoDB

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository (for Debian 12 Bookworm)
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# For Debian 11 Bullseye, use:
# echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | \
#    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
mongosh --eval "db.version()"
```

### Secure MongoDB (Optional but Recommended)

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application user
use time-tracking
db.createUser({
  user: "timetracker",
  pwd: "your_app_password",
  roles: [ { role: "readWrite", db: "time-tracking" } ]
})

exit
```

Then enable authentication in `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

## 4. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs (with sudo)
```

## 5. Install and Configure Nginx

```bash
sudo apt install -y nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/timetracker
```

Add the following configuration:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name timetracker.snpdnd.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name timetracker.snpdnd.com;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/timetracker.snpdnd.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/timetracker.snpdnd.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend (Angular app)
    root /var/www/timetracker;
    index index.html;

    # Handle Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/timetracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
```

## 6. Setup SSL with Let's Encrypt

First, create a temporary HTTP-only config to get the certificate:

```bash
# Create temporary config for certbot
sudo nano /etc/nginx/sites-available/timetracker-temp
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name timetracker.snpdnd.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        root /var/www/html;
    }
}
```

```bash
# Enable temporary config
sudo rm /etc/nginx/sites-enabled/timetracker 2>/dev/null || true
sudo ln -sf /etc/nginx/sites-available/timetracker-temp /etc/nginx/sites-enabled/timetracker
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot certonly --webroot -w /var/www/certbot -d timetracker.snpdnd.com

# Now enable the full HTTPS config
sudo ln -sf /etc/nginx/sites-available/timetracker /etc/nginx/sites-enabled/timetracker
sudo nginx -t && sudo systemctl reload nginx
```

### Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a systemd timer for renewal
sudo systemctl status certbot.timer
```

## 7. Setup GitHub Actions Self-Hosted Runner

### Create Runner User

```bash
# Create a dedicated user for the runner
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG sudo github-runner

# Allow github-runner to run specific commands without password
sudo visudo
```

Add these lines to sudoers:

```
github-runner ALL=(ALL) NOPASSWD: /usr/bin/mkdir
github-runner ALL=(ALL) NOPASSWD: /usr/bin/chown
github-runner ALL=(ALL) NOPASSWD: /usr/bin/rm
github-runner ALL=(ALL) NOPASSWD: /usr/bin/cp
github-runner ALL=(ALL) NOPASSWD: /usr/bin/nginx
github-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
github-runner ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
```

### Install GitHub Runner

```bash
# Switch to runner user
sudo su - github-runner

# Create runner directory
mkdir actions-runner && cd actions-runner

# Download the latest runner (check GitHub for latest version)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
```

### Configure Runner

1. Go to your GitHub repository: `https://github.com/PauloDevelo/time-tracker`
2. Navigate to **Settings** → **Actions** → **Runners** → **New self-hosted runner**
3. Copy the configuration token and run:

```bash
# Configure the runner (replace TOKEN with your token)
./config.sh --url https://github.com/PauloDevelo/time-tracker --token YOUR_TOKEN

# When prompted:
# - Runner group: Default
# - Runner name: timetracker-prod
# - Labels: self-hosted,Linux,X64,production
# - Work folder: _work
```

### Install Runner as Service

```bash
# Exit back to your admin user
exit

# Install and start the service
cd /home/github-runner/actions-runner
sudo ./svc.sh install github-runner
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

## 8. Create Application Directories

```bash
# Create application directories
sudo mkdir -p /opt/time-tracker
sudo mkdir -p /opt/time-tracker-backups
sudo mkdir -p /var/www/timetracker

# Set ownership
sudo chown -R github-runner:github-runner /opt/time-tracker
sudo chown -R github-runner:github-runner /opt/time-tracker-backups
sudo chown -R www-data:www-data /var/www/timetracker
```

## 9. Create Backend Environment File

```bash
sudo nano /opt/time-tracker/backend/.env
```

Add your environment variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/time-tracking
# If using authentication:
# MONGODB_URI=mongodb://timetracker:your_app_password@127.0.0.1:27017/time-tracking

# JWT Configuration
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Encryption Configuration (for Azure DevOps PAT)
ENCRYPTION_KEY=your_32_character_encryption_key!

# Frontend URL (for CORS)
FRONTEND_URL=https://timetracker.snpdnd.com
```

Set proper permissions:

```bash
sudo chown github-runner:github-runner /opt/time-tracker/backend/.env
sudo chmod 600 /opt/time-tracker/backend/.env
```

## 10. Setup GitHub Environment Protection

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Click **New environment**
4. Name it `production`
5. Configure protection rules:
   - ✅ **Required reviewers**: Add yourself
   - ⏱️ **Wait timer**: 0-5 minutes (optional, gives you time to cancel)
   - 🔒 **Deployment branches**: Select "main" only

## 11. Firewall Configuration (iptables + fail2ban)

Your server uses iptables and fail2ban (already configured).

### Verify iptables Rules

Ensure HTTP and HTTPS ports are open:

```bash
# Check current iptables rules
sudo iptables -L -n -v

# If ports 80 and 443 are not open, add them:
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules to persist across reboots
sudo netfilter-persistent save
```

### Verify fail2ban Status

Your server already has fail2ban configured with the following jails:

| Jail | Purpose |
|------|---------|
| `sshd` | Protects SSH from brute force attacks |
| `nginx-http-auth` | Protects HTTP authentication endpoints |
| `nginx-limit-req` | Rate limiting protection |
| `nginx-bad-request` | Blocks malformed requests |

```bash
# Check fail2ban status
sudo fail2ban-client status

# Check specific jail status
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth
```

### Useful fail2ban Commands

```bash
# View all jails and banned IPs
sudo fail2ban-client status

# Check a specific jail
sudo fail2ban-client status sshd

# Unban an IP address
sudo fail2ban-client set <jail-name> unbanip <ip-address>

# Example: Unban IP from sshd jail
sudo fail2ban-client set sshd unbanip 192.168.1.100

# View fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### Verify Firewall Configuration

```bash
# Check iptables rules
sudo iptables -L -n -v

# Check fail2ban status
sudo fail2ban-client status

# Test that ports are open (from another machine)
# nc -zv timetracker.snpdnd.com 80
# nc -zv timetracker.snpdnd.com 443
```

## 12. Verify Setup

Run these commands to verify everything is set up correctly:

```bash
# Check Node.js
node --version

# Check MongoDB
sudo systemctl status mongod
mongosh --eval "db.version()"

# Check PM2
pm2 --version

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check GitHub Runner
sudo systemctl status actions.runner.PauloDevelo-time-tracker.timetracker-prod.service

# Check SSL certificate
sudo certbot certificates
```

## Troubleshooting

### MongoDB won't start

```bash
# Check logs
sudo journalctl -u mongod -n 50

# Check if port is in use
sudo lsof -i :27017
```

### Nginx configuration errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### GitHub Runner issues

```bash
# Check runner logs
sudo journalctl -u actions.runner.PauloDevelo-time-tracker.timetracker-prod.service -n 50

# Restart runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

### PM2 issues

```bash
# Check PM2 logs
pm2 logs time-tracker-backend

# Restart application
pm2 restart time-tracker-backend

# Check PM2 status
pm2 status
```

## Maintenance

### Update SSL Certificate

Certbot handles this automatically, but you can force renewal:

```bash
sudo certbot renew
```

### Backup MongoDB

```bash
# Create backup
mongodump --db time-tracking --out /opt/time-tracker-backups/mongodb_$(date +%Y%m%d)

# Restore backup
mongorestore --db time-tracking /opt/time-tracker-backups/mongodb_YYYYMMDD/time-tracking
```

### View Application Logs

```bash
# Backend logs
pm2 logs time-tracker-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```
