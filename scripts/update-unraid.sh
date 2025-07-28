#!/bin/bash

# Forecast Performance - Unraid Update Script
# This script updates the application to the latest version

set -e

echo "🔄 Forecast Performance - Update Script"
echo "======================================="

# Configuration
APPDATA_PATH="/mnt/user/appdata/forecast-performance"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if deployment exists
if [ ! -d "$APPDATA_PATH" ] || [ ! -f "$APPDATA_PATH/docker-compose.yml" ]; then
    print_error "Application not found. Run setup-unraid.sh first."
    exit 1
fi

cd "$APPDATA_PATH"

# Create backup of current database
print_step "Creating database backup..."
if docker exec forecast-postgres pg_dump -U forecast_user forecastperformance > "backup-$(date +%Y%m%d-%H%M%S).sql" 2>/dev/null; then
    print_success "Database backup created"
else
    print_error "Backup failed - continuing anyway"
fi

# Pull latest images
print_step "Pulling latest images..."
docker-compose pull

# Restart containers with new images
print_step "Restarting containers..."
docker-compose up -d

# Run any pending database migrations
print_step "Running database migrations..."
sleep 5
if docker exec forecast-app npx prisma db push 2>/dev/null; then
    print_success "Database updated"
else
    print_error "Migration failed - check logs"
fi

# Check status
print_step "Verifying update..."
if docker-compose ps | grep -q "Up"; then
    print_success "Update completed successfully!"
    echo ""
    echo "🎉 Application Updated!"
    echo "====================="
    UNRAID_IP=$(ip route get 1 | awk '{print $7}' | head -1)
    echo "📱 Access your app at: http://$UNRAID_IP:3000"
    echo "📋 Check logs: docker logs forecast-app"
else
    print_error "Update failed. Check container logs and restore from backup if needed."
fi