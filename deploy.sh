#!/bin/bash

# Marketing Dashboard Deployment Script
# Server: 167.71.223.157
# Domain: digital.29jewellery.com

set -e

echo "=== Marketing Dashboard Deployment ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/nayyedeveloper-gif/digital.git"
APP_DIR="/var/www/digital"
DOMAIN="digital.29jewellery.com"
API_PORT="3001"
GOOGLE_API_KEY="AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8"

echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 2: Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo -e "${YELLOW}Step 3: Installing pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

echo -e "${YELLOW}Step 4: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo -e "${YELLOW}Step 5: Cloning repository...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $APP_DIR
    git pull
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

echo -e "${YELLOW}Step 6: Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}Step 7: Building applications...${NC}"
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/chairman-dashboard build

echo -e "${YELLOW}Step 8: Starting API server with PM2...${NC}"
cd $APP_DIR/artifacts/api-server
pm2 delete marketing-api 2>/dev/null || true
pm2 start dist/index.mjs --name "marketing-api" \
  --env PORT=$API_PORT \
  --env GOOGLE_API_KEY=$GOOGLE_API_KEY \
  --env NODE_ENV=production

pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}Step 9: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name digital.29jewellery.com;
    
    # Redirect HTTP to HTTPS (will be configured after SSL)
    # return 301 https://$server_name$request_uri;
    
    # Frontend static files
    root /var/www/digital/artifacts/chairman-dashboard/dist/public;
    index index.html;
    
    # Frontend routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

echo -e "${YELLOW}Step 10: Setting up SSL certificate...${NC}"
echo "Running certbot for SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@29jewellery.com || echo "SSL setup failed, you may need to configure DNS first"

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Application URLs:"
echo "  - Frontend: http://$DOMAIN"
echo "  - API Health: http://$DOMAIN/api/healthz"
echo ""
echo "Server Management:"
echo "  - View API logs: pm2 logs marketing-api"
echo "  - Restart API: pm2 restart marketing-api"
echo "  - Check status: pm2 status"
echo ""
echo "Next steps:"
echo "  1. Ensure DNS A record points to: 167.71.223.157"
echo "  2. Wait for DNS propagation (5-30 minutes)"
echo "  3. Access: http://$DOMAIN"
echo ""
