# Redis Quick Setup Guide

## Windows (WSL2) - Recommended
```bash
# Install WSL2 if you haven't already
wsl --install

# Install Redis in WSL2
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
# Should return: PONG
```

## Windows (Docker) - Alternative
```bash
# Install Docker Desktop first, then:
docker run -d --name redis -p 6379:6379 redis:alpine

# Test connection
docker exec -it redis redis-cli ping
```

## macOS
```bash
# Using Homebrew
brew install redis
brew services start redis

# Test connection
redis-cli ping
```

## Environment Variables
Add to your `.env.local`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Verify Connection
After starting Redis, restart your Next.js development server:
```bash
npm run dev
```

The background job system should now work without connection errors. 