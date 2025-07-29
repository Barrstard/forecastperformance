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

# Change to app directory
cd "$APPDATA_PATH"

# Download environment template first
print_step "Downloading environment template..."
if curl -sf "$REPO_URL/.env.unraid.template" -o .env.template; then
    print_success "Environment template downloaded"
else
    print_error "Failed to download environment template"
    exit 1
fi

# Detect existing services
print_step "Detecting existing services..."

# Check for existing PostgreSQL
POSTGRES_EXTERNAL=false
POSTGRES_HOST="postgres"
POSTGRES_PORT=5432
POSTGRES_USER="gbarr1"
POSTGRES_DB="sales"

if netstat -tuln | grep -q ":5432 "; then
    print_success "PostgreSQL detected on port 5432 - will use existing service"
    POSTGRES_EXTERNAL=true
    POSTGRES_HOST="localhost"
    POSTGRES_PORT=5432
    # Keep default user/db or get from existing .env if available
    if [ -f ".env" ]; then
        EXISTING_DB_URL=$(grep "DATABASE_URL" .env 2>/dev/null || echo "")
        if [ ! -z "$EXISTING_DB_URL" ]; then
            EXTRACTED_USER=$(echo "$EXISTING_DB_URL" | sed 's/.*:\/\/\([^:]*\):.*/\1/')
            EXTRACTED_DB=$(echo "$EXISTING_DB_URL" | sed 's/.*\/\([^?]*\).*/\1/')
            if [ ! -z "$EXTRACTED_USER" ] && [ "$EXTRACTED_USER" != "DATABASE_URL" ]; then
                POSTGRES_USER="$EXTRACTED_USER"
            fi
            if [ ! -z "$EXTRACTED_DB" ] && [ "$EXTRACTED_DB" != "$EXISTING_DB_URL" ]; then
                POSTGRES_DB="$EXTRACTED_DB"
            fi
        fi
    fi
    echo "Using PostgreSQL: $POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
else
    print_success "No PostgreSQL detected - will deploy in container"
fi

# Check for existing Redis
REDIS_EXTERNAL=false
REDIS_HOST="redis"
REDIS_PORT=6379

if netstat -tuln | grep -q ":6379 "; then
    print_success "Redis detected on port 6379 - will use existing service"
    REDIS_EXTERNAL=true
    REDIS_HOST="localhost"
    REDIS_PORT=6379
else
    print_success "No Redis detected - will deploy in container"
fi

# Decide whether to download static compose file or generate dynamic one
if [ "$POSTGRES_EXTERNAL" = false ] && [ "$REDIS_EXTERNAL" = false ]; then
    # Both services will be containerized - use static compose file
    print_step "Downloading Docker Compose file from: $REPO_URL/docker-compose.unraid.yml"
    if curl -sf "$REPO_URL/docker-compose.unraid.yml" -o docker-compose.yml; then
        print_success "Docker Compose file downloaded"
    else
        print_error "Failed to download Docker Compose file"
        print_error "URL attempted: $REPO_URL/docker-compose.unraid.yml"
        print_error "Please check your internet connection and repository access"
        exit 1
    fi
else
    # One or both services are external - will generate dynamic compose file later
    print_success "Will generate dynamic Docker Compose configuration"
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
    
    # Check Web port
    if netstat -tuln | grep -q ":$WEB_PORT "; then
        print_warning "Port $WEB_PORT is already in use"
        read -p "Enter alternative web port: " ALT_WEB_PORT
        WEB_PORT=${ALT_WEB_PORT:-$((WEB_PORT + 1))}
    fi
    
    # Update .env file with detected configurations
    sed -i "s/your_secure_postgres_password_here/$POSTGRES_PASSWORD/g" .env
    sed -i "s/your_nextauth_secret_here/$NEXTAUTH_SECRET/g" .env
    sed -i "s/your-unraid-ip/$UNRAID_IP/g" .env
    sed -i "s/3000/$WEB_PORT/g" .env
    
    # Update database connection string
    sed -i "s|postgresql://gbarr1:your_secure_postgres_password_here@postgres:5432/sales|postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB|g" .env
    
    # Update Redis URL  
    sed -i "s|redis://redis:6379|redis://$REDIS_HOST:$REDIS_PORT|g" .env
    
    print_success "Environment configured"
    echo -e "${YELLOW}Your app will be available at: http://$UNRAID_IP:$WEB_PORT${NC}"
else
    print_success "Using existing .env file"
    
    # Check if .env file is corrupted (contains shell script code)
    if grep -q "print_step\|echo\|if\|fi" .env 2>/dev/null; then
        print_warning ".env file appears to be corrupted - will recreate it"
        mv .env .env.backup.$(date +%s)
        cp .env.template .env
        print_step "Corrupted .env backed up, using template for configuration"
        # Fall through to interactive configuration
        CORRUPTED_ENV=true
    else
        CORRUPTED_ENV=false
    fi
    
    if [ "$CORRUPTED_ENV" = false ]; then
        NEXTAUTH_LINE=$(grep NEXTAUTH_URL .env 2>/dev/null || echo "")
        UNRAID_IP=$(echo "$NEXTAUTH_LINE" | cut -d'/' -f3 | cut -d':' -f1)
        
        # More robust WEB_PORT extraction
        WEB_PORT_RAW=$(echo "$NEXTAUTH_LINE" | cut -d':' -f3)
        if [ -z "$WEB_PORT_RAW" ]; then
            WEB_PORT="3000"
        else
            WEB_PORT="$WEB_PORT_RAW"
        fi
        
        # Validate WEB_PORT is numeric
        if ! [[ "$WEB_PORT" =~ ^[0-9]+$ ]]; then
            print_warning "Invalid port '$WEB_PORT', using default 3000"
            WEB_PORT="3000"
        fi
    
    # Still check web port for conflicts
    if netstat -tuln | grep -q ":$WEB_PORT "; then
        print_warning "Port $WEB_PORT is already in use"
        read -p "Enter alternative web port: " ALT_WEB_PORT
        NEW_WEB_PORT=${ALT_WEB_PORT:-$((WEB_PORT + 1))}
        # Update the existing .env file - fix the sed command
        OLD_URL="http://$UNRAID_IP:$WEB_PORT"
        NEW_URL="http://$UNRAID_IP:$NEW_WEB_PORT"
        # Escape special characters for sed
        OLD_URL_ESCAPED=$(printf '%s\n' "$OLD_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')
        NEW_URL_ESCAPED=$(printf '%s\n' "$NEW_URL" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i "s|NEXTAUTH_URL=$OLD_URL_ESCAPED|NEXTAUTH_URL=$NEW_URL_ESCAPED|g" .env
        WEB_PORT="$NEW_WEB_PORT"
    fi
    else
        # .env was corrupted, need to set it up interactively
        print_step "Setting up environment configuration..."
        
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
        
        # Update .env file with detected configurations
        sed -i "s/your_secure_postgres_password_here/$POSTGRES_PASSWORD/g" .env
        sed -i "s/your_nextauth_secret_here/$NEXTAUTH_SECRET/g" .env
        sed -i "s/your-unraid-ip/$UNRAID_IP/g" .env
        sed -i "s/3000/$WEB_PORT/g" .env
        
        # Update database connection string
        sed -i "s|postgresql://gbarr1:your_secure_postgres_password_here@postgres:5432/sales|postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB|g" .env
        
        # Update Redis URL  
        sed -i "s|redis://redis:6379|redis://$REDIS_HOST:$REDIS_PORT|g" .env
        
        print_success "Environment configured"
        echo -e "${YELLOW}Your app will be available at: http://$UNRAID_IP:$WEB_PORT${NC}"
    fi
fi

# Create dynamic docker-compose configuration only if needed
if [ "$POSTGRES_EXTERNAL" = true ] || [ "$REDIS_EXTERNAL" = true ]; then
    print_step "Creating dynamic docker-compose configuration..."

    # Build the complete docker-compose content
COMPOSE_CONTENT="version: '3.8'

services:"

# Add PostgreSQL service if not external
if [ "$POSTGRES_EXTERNAL" = false ]; then
    COMPOSE_CONTENT="$COMPOSE_CONTENT
  postgres:
    image: postgres:15-alpine
    container_name: forecast-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: $POSTGRES_DB
      POSTGRES_USER: $POSTGRES_USER
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - /mnt/user/appdata/forecast-performance/postgres:/var/lib/postgresql/data
    ports:
      - \"$POSTGRES_PORT:5432\"
    networks:
      - forecast-network
    healthcheck:
      test: [\"CMD-SHELL\", \"pg_isready -U $POSTGRES_USER -d $POSTGRES_DB\"]
      interval: 30s
      timeout: 10s
      retries: 3
"
fi

# Add Redis service if not external
if [ "$REDIS_EXTERNAL" = false ]; then
    COMPOSE_CONTENT="$COMPOSE_CONTENT
  redis:
    image: redis:7-alpine
    container_name: forecast-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - /mnt/user/appdata/forecast-performance/redis:/data
    ports:
      - \"$REDIS_PORT:6379\"
    networks:
      - forecast-network
    healthcheck:
      test: [\"CMD\", \"redis-cli\", \"ping\"]
      interval: 30s
      timeout: 10s
      retries: 3
"
fi

# Add app service (always included)
COMPOSE_CONTENT="$COMPOSE_CONTENT
  app:
    image: ghcr.io/barrstard/forecastperformance:latest
    container_name: forecast-app
    restart: unless-stopped"

# Add depends_on only for containerized services  
DEPENDS_ON_SECTION=""
if [ "$POSTGRES_EXTERNAL" = false ] || [ "$REDIS_EXTERNAL" = false ]; then
    DEPENDS_ON_SECTION="    depends_on:"
    if [ "$POSTGRES_EXTERNAL" = false ]; then
        DEPENDS_ON_SECTION="$DEPENDS_ON_SECTION
      postgres:
        condition: service_healthy"
    fi
    if [ "$REDIS_EXTERNAL" = false ]; then
        DEPENDS_ON_SECTION="$DEPENDS_ON_SECTION
      redis:
        condition: service_healthy"
    fi
fi

# Add the depends_on section to compose content
if [ ! -z "$DEPENDS_ON_SECTION" ]; then
    COMPOSE_CONTENT="$COMPOSE_CONTENT
$DEPENDS_ON_SECTION"
fi

# Continue with app configuration
COMPOSE_CONTENT="$COMPOSE_CONTENT
    environment:
      DATABASE_URL: postgresql://$POSTGRES_USER:\${POSTGRES_PASSWORD}@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB
      REDIS_URL: redis://$REDIS_HOST:$REDIS_PORT
      NEXTAUTH_URL: \${NEXTAUTH_URL}
      NEXTAUTH_SECRET: \${NEXTAUTH_SECRET}
      NODE_ENV: production
    volumes:
      - /mnt/user/appdata/forecast-performance/uploads:/app/uploads
      - /mnt/user/appdata/forecast-performance/logs:/app/logs
    ports:
      - \"$WEB_PORT:3000\"
    networks:
      - forecast-network

networks:
  forecast-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local"

    # Write the complete compose file
    echo "$COMPOSE_CONTENT" > docker-compose.yml

    print_success "Dynamic Docker Compose configuration created"
else
    print_success "Using static Docker Compose configuration"
fi

# Check for docker-compose and install if needed
if ! command -v docker-compose &> /dev/null; then
    print_step "Installing docker-compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "docker-compose installed"
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
    print_step "Trying alternative database initialization..."
    if docker exec forecast-app npx prisma migrate deploy 2>/dev/null; then
        print_success "Database migrated successfully"
    else
        print_warning "Database migration also failed - manual intervention may be required"
    fi
fi

# Final status check
print_step "Checking container status..."
if docker-compose ps | grep -q "Up"; then
    print_success "Containers are running!"
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    
    # Get actual ports and show service information
    ACTUAL_WEB_PORT=$(grep NEXTAUTH_URL .env | cut -d':' -f3 || echo "$WEB_PORT")
    
    echo "📱 Access your app at: http://$UNRAID_IP:$ACTUAL_WEB_PORT"
    
    if [ "$POSTGRES_EXTERNAL" = true ]; then
        echo "🗄️  PostgreSQL: External service at $POSTGRES_HOST:$POSTGRES_PORT"
    else
        echo "🗄️  PostgreSQL: Container at localhost:$POSTGRES_PORT"
    fi
    
    if [ "$REDIS_EXTERNAL" = true ]; then
        echo "🔴 Redis: External service at $REDIS_HOST:$REDIS_PORT"
    else
        echo "🔴 Redis: Container at localhost:$REDIS_PORT"
    fi
    echo "🔧 Configuration: $APPDATA_PATH/.env"
    echo "📋 Logs: docker logs forecast-app"
    echo ""
    print_warning "Important: Review and customize your .env file settings"
else
    print_error "Some containers failed to start. Check logs:"
    echo "  docker logs forecast-app"
    echo "  docker logs forecast-postgres"
fi