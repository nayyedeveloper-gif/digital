# Server Deployment Commands

## Server Information
- **IP:** 167.71.223.157
- **Deployment Path:** /var/www/digital
- **Domain:** digital.29jewellery.com

## Step-by-Step Deployment

### 1. Connect to Server
```bash
ssh root@167.71.223.157
```

### 2. Install System Dependencies
```bash
# Update system
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2
```

### 3. Clone Repository
```bash
# Create directory and clone
git clone https://github.com/nayyedeveloper-gif/digital.git /var/www/digital
cd /var/www/digital
```

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Build Applications
```bash
# Build API Server
pnpm --filter @workspace/api-server build

# Build Frontend Dashboard
pnpm --filter @workspace/chairman-dashboard build
```

### 6. Start API Server with PM2
```bash
cd /var/www/digital/artifacts/api-server

pm2 start dist/index.mjs --name "marketing-api" \
  --env PORT=3001 \
  --env GOOGLE_API_KEY=AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8 \
  --env NODE_ENV=production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
```

### 7. Configure Nginx
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/digital.29jewellery.com << 'EOF'
server {
    listen 80;
    server_name digital.29jewellery.com;
    
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
ln -sf /etc/nginx/sites-available/digital.29jewellery.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 8. Setup SSL Certificate (After DNS is configured)
```bash
certbot --nginx -d digital.29jewellery.com --non-interactive --agree-tos --email admin@29jewellery.com
```

### 9. Configure DNS (Do this in your DNS provider)
```
Type: A Record
Name: digital
Value: 167.71.223.157
TTL: 3600 (or Auto)
```

## Verification Commands

### Check API Server Status
```bash
pm2 status
pm2 logs marketing-api
```

### Check Nginx Status
```bash
systemctl status nginx
nginx -t
```

### Test API Endpoint
```bash
curl http://localhost:3001/api/healthz
curl http://digital.29jewellery.com/api/healthz
```

### View Logs
```bash
# API Server logs
pm2 logs marketing-api

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

## Update Application (Future Updates)

```bash
cd /var/www/digital
git pull
pnpm install
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/chairman-dashboard build
pm2 restart marketing-api
```

## Troubleshooting

### API Server Not Starting
```bash
pm2 logs marketing-api --lines 100
pm2 restart marketing-api
```

### Frontend Not Loading
```bash
# Check if files exist
ls -la /var/www/digital/artifacts/chairman-dashboard/dist/public

# Check Nginx configuration
nginx -t
systemctl restart nginx
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
# Restart API
pm2 restart marketing-api
```

## Quick Deployment Script

You can also run the automated deployment script:
```bash
bash /root/deploy.sh
```
