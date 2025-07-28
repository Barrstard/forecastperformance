# Unraid Deployment Guide

This guide will help you deploy the Forecast Performance application on your Unraid server with GitHub integration.

## Prerequisites

1. Unraid server with Docker enabled
2. Community Applications plugin installed
3. GitHub repository access
4. SSH access to your Unraid server

## Quick Setup (5 minutes)

### Step 1: Prepare Unraid

1. **Create appdata directory structure** (via SSH or terminal):
   ```bash
   mkdir -p /mnt/user/appdata/forecast-performance/{postgres,redis,uploads,logs}
   chmod -R 755 /mnt/user/appdata/forecast-performance
   ```

### Step 2: Configure Environment

1. **Create environment file**:
   ```bash
   cd /mnt/user/appdata/forecast-performance
   cp .env.unraid.template .env
   ```

2. **Edit the .env file** with your settings:
   ```bash
   nano .env
   ```
   
   Update these critical values:
   - `POSTGRES_PASSWORD` - Strong password for PostgreSQL
   - `NEXTAUTH_URL` - Your Unraid server IP (e.g., http://192.168.1.100:3000)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

### Step 3: Deploy with Docker Compose

1. **Copy deployment files to Unraid**:
   ```bash
   wget https://raw.githubusercontent.com/Barrstard/forecastperformance/main/docker-compose.unraid.yml
   ```

2. **Start the application**:
   ```bash
   docker-compose -f docker-compose.unraid.yml up -d
   ```

3. **Initialize the database**:
   ```bash
   docker exec forecast-app npx prisma db push
   ```

### Step 4: Access Your Application

- **Web Interface**: `http://YOUR_UNRAID_IP:3000`
- **Database Admin**: Use Adminer or pgAdmin container if needed

## GitHub Integration Setup

### Enable Automatic Deployments

1. **In your GitHub repository**, go to Settings → Secrets and variables → Actions

2. **Add these secrets**:
   - `UNRAID_WEBHOOK_URL` (optional) - For automatic deployments

3. **Push to main branch** - Your app will automatically build and deploy!

## Unraid Web UI Setup (Alternative Method)

If you prefer using the Unraid web interface:

### PostgreSQL Container
1. Go to **Docker** → **Add Container**
2. **Repository**: `postgres:15-alpine`
3. **Network Type**: Bridge
4. **Port Mappings**: Host: 5432, Container: 5432
5. **Volume Mappings**: 
   - Container: `/var/lib/postgresql/data`
   - Host: `/mnt/user/appdata/forecast-performance/postgres`
6. **Environment Variables**:
   ```
   POSTGRES_DB=forecastperformance
   POSTGRES_USER=forecast_user
   POSTGRES_PASSWORD=your_secure_password
   ```

### Redis Container
1. **Repository**: `redis:7-alpine`
2. **Network Type**: Bridge
3. **Port Mappings**: Host: 6379, Container: 6379
4. **Volume Mappings**:
   - Container: `/data`
   - Host: `/mnt/user/appdata/forecast-performance/redis`
5. **Extra Parameters**: `--appendonly yes`

### Application Container
1. **Repository**: `ghcr.io/barrstard/forecastperformance:latest`
2. **Network Type**: Bridge
3. **Port Mappings**: Host: 3000, Container: 3000
4. **Volume Mappings**:
   - Container: `/app/uploads`, Host: `/mnt/user/appdata/forecast-performance/uploads`
   - Container: `/app/logs`, Host: `/mnt/user/appdata/forecast-performance/logs`
5. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://forecast_user:your_password@YOUR_UNRAID_IP:5432/forecastperformance
   REDIS_URL=redis://YOUR_UNRAID_IP:6379
   NEXTAUTH_URL=http://YOUR_UNRAID_IP:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   NODE_ENV=production
   ```

## Maintenance

### Updating the Application
```bash
cd /mnt/user/appdata/forecast-performance
docker-compose -f docker-compose.unraid.yml pull
docker-compose -f docker-compose.unraid.yml up -d
```

### Backup Database
```bash
docker exec forecast-postgres pg_dump -U forecast_user forecastperformance > backup.sql
```

### View Logs
```bash
docker logs forecast-app
docker logs forecast-postgres
```

## Troubleshooting

### Container Won't Start
1. Check logs: `docker logs forecast-app`
2. Verify environment variables are set correctly
3. Ensure PostgreSQL is running and accessible

### Database Connection Issues
1. Verify PostgreSQL container is healthy: `docker ps`
2. Test connection: `docker exec forecast-postgres pg_isready -U forecast_user`
3. Check network connectivity between containers

### Port Already in Use
1. Stop conflicting services: `docker ps` and `docker stop <container>`
2. Or change ports in docker-compose.unraid.yml

## Security Notes

- Change default passwords before deployment
- Consider using Unraid's built-in reverse proxy for HTTPS
- Regularly update containers for security patches
- Restrict access via Unraid's firewall if needed

## Support

For issues:
1. Check container logs first
2. Verify all environment variables
3. Ensure proper file permissions on appdata directories
4. Create GitHub issue if problems persist