#!/bin/bash

# Forecast Performance - Unraid Setup Script
# This script automates the deployment setup on Unraid

set -e

echo "🎯 Forecast Performance - Unraid Setup"
echo "======================================"

# Configuration
APPDATA_PATH="/mnt/user/appdata/forecast-performance"
REPO_URL="https://raw.githubusercontent.com/Barrstard/forecastperformance/master"

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on Unraid
if [ ! -d "/mnt/user" ]; then
    print_error "This script must be run on an Unraid server"
    exit 1
fi

# Create directory structure
print_step "Creating application directories..."
mkdir -p "$APPDATA_PATH"/{postgres,redis,uploads,logs}
chmod -R 755 "$APPDATA_PATH"
print_success "Directories created"

# Download deployment files
print_step "Downloading deployment files..."
cd "$APPDATA_PATH"

# Download docker-compose file
if curl -sf "$REPO_URL/docker-compose.unraid.yml" -o docker-compose.yml; then
    print_success "Docker Compose file downloaded"
else
    print_error "Failed to download Docker Compose file"
    exit 1
fi

# Download environment template
if curl -sf "$REPO_URL/.env.unraid.template" -o .env.template; then
    print_success "Environment template downloaded"
else
    print_error "Failed to download environment template"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_step "Setting up environment configuration..."
    cp .env.template .env
    
    # Interactive configuration
    echo ""
    echo "🔧 Configuration Setup"
    echo "======================"
    
    # Get Unraid IP (auto-detect with option to override)
    DETECTED_IP=$(ip route get 1 | awk '{print $7}' | head -1 2>/dev/null || echo "192.168.1.100")
    echo -e "${BLUE}Detected Unraid IP: $DETECTED_IP${NC}"
    read -p "Press Enter to use detected IP, or enter your Unraid server IP: " USER_IP
    UNRAID_IP=${USER_IP:-$DETECTED_IP}
    
    # Database password
    echo ""
    read -p "Enter PostgreSQL password (or press Enter for auto-generated): " USER_DB_PASSWORD
    if [ -z "$USER_DB_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        echo -e "${GREEN}Generated secure password${NC}"
    else
        POSTGRES_PASSWORD="$USER_DB_PASSWORD"
    fi
    
    # NextAuth secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Port configuration
    echo ""
    read -p "Enter port for web interface (default: 3000): " USER_PORT
    WEB_PORT=${USER_PORT:-3000}
    
    # Update .env file
    sed -i "s/your_secure_postgres_password_here/$POSTGRES_PASSWORD/g" .env
    sed -i "s/your_nextauth_secret_here/$NEXTAUTH_SECRET/g" .env
    sed -i "s/your-unraid-ip/$UNRAID_IP/g" .env
    sed -i "s/3000/$WEB_PORT/g" .env
    
    # Update docker-compose port if needed
    if [ "$WEB_PORT" != "3000" ]; then
        sed -i "s/3000:3000/$WEB_PORT:3000/g" docker-compose.yml
    fi
    
    print_success "Environment configured"
    echo -e "${YELLOW}Your app will be available at: http://$UNRAID_IP:$WEB_PORT${NC}"
else
    print_success "Using existing .env file"
    UNRAID_IP=$(grep NEXTAUTH_URL .env | cut -d'/' -f3 | cut -d':' -f1)
    WEB_PORT=$(grep NEXTAUTH_URL .env | cut -d':' -f3 || echo "3000")
fi

# Pull and start containers
print_step "Pulling Docker images..."
docker-compose pull

print_step "Starting containers..."
docker-compose up -d

# Wait for database to be ready
print_step "Waiting for database to be ready..."
sleep 10

# Initialize database
print_step "Initializing database..."
if docker exec forecast-app npx prisma db push 2>/dev/null; then
    print_success "Database initialized"
else
    print_warning "Database initialization may have failed - check logs if app doesn't work"
fi

# Final status check
print_step "Checking container status..."
if docker-compose ps | grep -q "Up"; then
    print_success "Containers are running!"
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo "📱 Access your app at: http://$UNRAID_IP:3000"
    echo "🔧 Configuration: $APPDATA_PATH/.env"
    echo "📋 Logs: docker logs forecast-app"
    echo ""
    print_warning "Important: Review and customize your .env file settings"
else
    print_error "Some containers failed to start. Check logs:"
    echo "  docker logs forecast-app"
    echo "  docker logs forecast-postgres"
fi