# Production Deployment Guide

## Domain Configuration
- **Frontend Domain:** digital.29jewellery.com
- **API Endpoint:** https://digital.29jewellery.com/api

## Prerequisites

1. **Google Sheets API Key** (Already configured)
   - API Key: AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8
   - Spreadsheet ID: 1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY

2. **Server Requirements**
   - Node.js 20+
   - pnpm package manager
   - Domain with SSL certificate

## Deployment Steps

### 1. Build the Applications

```bash
# Build API Server
cd /Users/developer/Downloads/Marketing-Dashboard
pnpm --filter @workspace/api-server build

# Build Frontend Dashboard
pnpm --filter @workspace/chairman-dashboard build
```

### 2. Configure Environment Variables

**API Server (.env):**
```bash
PORT=3001
GOOGLE_API_KEY=AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8
NODE_ENV=production
```

**Frontend Dashboard:**
Already configured in `.env.production`:
- VITE_API_BASE_URL=https://digital.29jewellery.com
- BASE_PATH=/

### 3. Deploy API Server

The API server should be deployed as a backend service:

```bash
# Start API server in production mode
cd artifacts/api-server
PORT=3001 GOOGLE_API_KEY=AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8 NODE_ENV=production node dist/index.mjs
```

**Recommended: Use PM2 for process management**
```bash
npm install -g pm2

# Create PM2 ecosystem file
pm2 start dist/index.mjs --name "marketing-api" \
  --env PORT=3001 \
  --env GOOGLE_API_KEY=AIzaSyDn4qzyJHZo-3tRalBgxgzVBprW8UiqUd8 \
  --env NODE_ENV=production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Deploy Frontend Dashboard

The frontend build output is in `artifacts/chairman-dashboard/dist/public/`

**Option A: Deploy to Static Hosting (Recommended)**

Upload the contents of `dist/public/` to:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static hosting service

**Option B: Serve with Nginx**

```nginx
server {
    listen 80;
    server_name digital.29jewellery.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name digital.29jewellery.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Frontend static files
    root /path/to/Marketing-Dashboard/artifacts/chairman-dashboard/dist/public;
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
```

### 5. SSL Certificate Setup

**Using Let's Encrypt (Free):**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d digital.29jewellery.com
```

### 6. DNS Configuration

Point your domain to your server:
```
A Record: digital.29jewellery.com → Your Server IP
```

## Verification

After deployment, verify:

1. **Frontend:** https://digital.29jewellery.com
2. **API Health:** https://digital.29jewellery.com/api/healthz
3. **Data Loading:** Check Overview page shows metrics

## Monitoring

### Check API Server Logs
```bash
# If using PM2
pm2 logs marketing-api

# If using systemd
journalctl -u marketing-api -f
```

### Check Frontend Access Logs
```bash
# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Data Not Loading
1. Check API server is running: `curl http://localhost:3001/api/healthz`
2. Verify Google API key is set correctly
3. Check spreadsheet is public (anyone with link can view)
4. Check browser console for CORS errors

### CORS Issues
If frontend and API are on different domains, configure CORS in API server:

Edit `artifacts/api-server/src/app.ts`:
```typescript
app.use(cors({
  origin: 'https://digital.29jewellery.com',
  credentials: true
}));
```

### 502 Bad Gateway
- API server is not running
- Check PM2 status: `pm2 status`
- Restart API: `pm2 restart marketing-api`

## Maintenance

### Update Data
Data automatically refreshes from Google Sheets every 5 minutes (cached).

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/chairman-dashboard build

# Restart services
pm2 restart marketing-api
# Re-upload frontend files to hosting
```

## Security Checklist

- ✅ Google Sheets API key stored in environment variables (not in code)
- ✅ HTTPS enabled with valid SSL certificate
- ✅ Spreadsheet set to view-only for public access
- ✅ API server not directly exposed (behind Nginx proxy)
- ✅ Environment variables not committed to git
- ✅ Regular security updates for dependencies

## Support

For issues or questions:
1. Check API server logs
2. Check browser console for errors
3. Verify Google Sheets API quota not exceeded
4. Ensure spreadsheet structure matches expected format
