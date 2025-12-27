#!/bin/bash
#
# Time Tracker Deployment Script
# This script is executed by the GitHub Actions self-hosted runner
# on the production server (timetracker.snpdnd.com)
#

set -e  # Exit on any error

# ============================================
# Configuration
# ============================================
APP_NAME="time-tracker"
APP_DIR="/opt/time-tracker"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_WEBROOT="/var/www/timetracker"
BACKUP_DIR="/opt/time-tracker-backups"
SOURCE_DIR="$(pwd)"  # Save the checkout/source directory

# Ensure common paths are in PATH (for GitHub Actions runner environment)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Helper Functions
# ============================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Pre-deployment Checks
# ============================================
log_info "Starting deployment..."

# Check if running as correct user (should be the runner user)
log_info "Running as user: $(whoami)"

# Check required tools
for cmd in node npm pm2; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is not installed. Please run the server setup first."
        exit 1
    fi
done

# Check nginx separately (may be in /usr/sbin which isn't always in PATH)
if ! command -v nginx &> /dev/null && [ ! -x /usr/sbin/nginx ]; then
    log_error "nginx is not installed. Please run the server setup first."
    exit 1
fi

log_info "Node version: $(node --version)"
log_info "NPM version: $(npm --version)"

# ============================================
# Create Backup
# ============================================
log_info "Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

if [ -d "$BACKEND_DIR/dist" ]; then
    tar -czf "$BACKUP_DIR/backend_$TIMESTAMP.tar.gz" -C "$BACKEND_DIR" dist 2>/dev/null || true
fi

if [ -d "$NGINX_WEBROOT" ]; then
    tar -czf "$BACKUP_DIR/frontend_$TIMESTAMP.tar.gz" -C "$NGINX_WEBROOT" . 2>/dev/null || true
fi

# Keep only last 5 backups
ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm

log_info "Backup created at $BACKUP_DIR"

# ============================================
# Deploy Backend
# ============================================
log_info "Deploying backend..."

# Create app directory if it doesn't exist
sudo mkdir -p "$APP_DIR"
sudo chown -R $(whoami):$(whoami) "$APP_DIR"

# Copy backend files
mkdir -p "$BACKEND_DIR"
cp -r "$SOURCE_DIR/backend/"* "$BACKEND_DIR/"

# Install dependencies (including dev dependencies for TypeScript build)
cd "$BACKEND_DIR"
log_info "Installing backend dependencies..."
npm ci

# Build TypeScript
log_info "Building backend..."
npm run build

# Remove dev dependencies after build to reduce deployment size
log_info "Pruning dev dependencies..."
npm prune --production

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_warn ".env file not found at $BACKEND_DIR/.env"
    log_warn "Please create it manually with the required environment variables."
    log_warn "You can use .env.example as a template."
fi

# Restart backend with PM2
log_info "Restarting backend service..."
cd "$BACKEND_DIR"

# Check if PM2 process exists
if pm2 describe $APP_NAME-backend > /dev/null 2>&1; then
    pm2 restart $APP_NAME-backend
else
    pm2 start dist/server.js --name "$APP_NAME-backend" --env production
fi

# Save PM2 configuration
pm2 save

log_info "Backend deployed successfully!"

# ============================================
# Deploy Frontend
# ============================================
log_info "Deploying frontend..."

# Create frontend build directory
mkdir -p "$FRONTEND_DIR"
cp -r "$SOURCE_DIR/frontend/"* "$FRONTEND_DIR/"

# Install dependencies
cd "$FRONTEND_DIR"
log_info "Installing frontend dependencies..."
npm ci

# Build for production
log_info "Building frontend..."
npm run build -- --configuration=production

# Copy built files to nginx webroot
sudo mkdir -p "$NGINX_WEBROOT"
sudo rm -rf "$NGINX_WEBROOT"/*
sudo cp -r dist/time-tracker-frontend/browser/* "$NGINX_WEBROOT/"
sudo chown -R www-data:www-data "$NGINX_WEBROOT"

log_info "Frontend deployed successfully!"

# ============================================
# Reload Nginx
# ============================================
log_info "Reloading nginx..."
sudo /usr/sbin/nginx -t && sudo /usr/bin/systemctl reload nginx

# ============================================
# Health Check
# ============================================
log_info "Running health checks..."

# Wait for backend to start
sleep 5

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    log_info "Backend health check: OK"
elif [ "$BACKEND_STATUS" = "404" ]; then
    log_warn "Backend is running but /api/health endpoint not found (this is OK)"
else
    log_warn "Backend health check returned: $BACKEND_STATUS"
fi

# Check frontend (via nginx)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    log_info "Frontend health check: OK"
else
    log_warn "Frontend health check returned: $FRONTEND_STATUS"
fi

# ============================================
# Summary
# ============================================
echo ""
log_info "=========================================="
log_info "Deployment completed successfully!"
log_info "=========================================="
log_info "Backend: http://localhost:3000"
log_info "Frontend: https://timetracker.snpdnd.com"
log_info ""
log_info "PM2 Status:"
pm2 list

echo ""
log_info "Deployment finished at $(date)"
