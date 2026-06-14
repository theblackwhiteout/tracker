# Deployment Guide - Unified Media Tracker

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Local Production Testing

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Create .env file with production variables
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=http://localhost:3000
EOF

# 4. Run production server
npm start
```

## Environment Variables (Required for Production)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | No | `development` | Set to `production` for deployment |
| `PORT` | No | `3000` | Server port |
| `JWT_SECRET` | **Yes (prod)** | - | Generate with: `openssl rand -base64 32` |
| `DATABASE_PATH` | No | `/tmp/tracker.db` (prod) | Absolute path to SQLite database file |
| `ALLOWED_ORIGINS` | **Yes (prod)** | - | Comma-separated list: `https://yourdomain.com,https://www.yourdomain.com` |
| `GEMINI_API_KEY` | No | - | For AI recommendations feature |

## Deployment Options

### Option 1: Heroku

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set ALLOWED_ORIGINS=https://your-app-name.herokuapp.com
heroku config:set DATABASE_PATH=/tmp/tracker.db

# Deploy
git push heroku main
```

### Option 2: DigitalOcean App Platform

1. Connect your GitHub repo
2. Set environment variables in dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET` (generate: `openssl rand -base64 32`)
   - `ALLOWED_ORIGINS=your-domain.com`
   - `DATABASE_PATH=/tmp/tracker.db`
3. Set build command: `npm run build`
4. Set start command: `npm start`

### Option 3: AWS Elastic Beanstalk

```bash
# Create .ebextensions/node.config
mkdir -p .ebextensions

cat > .ebextensions/node.config << EOF
option_settings:
  aws:elasticbeanstalk:container:nodejs:staticfiles:
    /static: /dist
  aws:autoscaling:launchconfiguration:
    EC2KeyName: your-key-name
EOF

# Deploy
eb create tracker-prod
eb setenv NODE_ENV=production JWT_SECRET=$(openssl rand -base64 32) ALLOWED_ORIGINS=your-domain.com
eb deploy
```

### Option 4: Docker (for any cloud provider)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY data ./data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

Build and deploy:
```bash
docker build -t tracker:latest .
docker run -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -e ALLOWED_ORIGINS=yourdomain.com \
  -e DATABASE_PATH=/tmp/tracker.db \
  tracker:latest
```

### Option 5: Railway (Easiest)

1. Connect GitHub repo to [Railway.app](https://railway.app)
2. Add variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` (use Railway's random generator)
   - `ALLOWED_ORIGINS=your-railway-url.railway.app`
   - `DATABASE_PATH=/tmp/tracker.db`
3. Deploy automatically from git push

## Important Production Considerations

### Database
- **SQLite** (/tmp) is suitable for single-instance deployments
- For horizontal scaling, migrate to **PostgreSQL** or **MongoDB**
- Backup `/tmp/tracker.db` regularly

### Security Checklist
- [ ] Generate strong JWT_SECRET (`openssl rand -base64 32`)
- [ ] Set ALLOWED_ORIGINS to your exact domains
- [ ] Use HTTPS only (enable in your hosting provider)
- [ ] Set CORS properly - no wildcards in production
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Review firestore.rules if migrating Firestore users

### Performance
- Frontend is pre-built as static files (no Vite server needed)
- API responses are cached where possible
- Database connections are pooled

### Monitoring
- Monitor error logs from your hosting provider
- Set up alerts for database disk space
- Track JWT_SECRET rotation schedule (optional but recommended)

## Troubleshooting

### JWT_SECRET error in production
```
Error: JWT_SECRET environment variable is required in production
```
**Fix**: Set `JWT_SECRET` environment variable before starting

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Fix**: Update `ALLOWED_ORIGINS` to include your domain:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Database not found
```
Error: Build directory not found. Run 'npm run build' first.
```
**Fix**: Run `npm run build` before deployment

### Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Fix**: Change PORT: `PORT=8080 npm start`

## Post-Deployment

1. Test authentication: Sign in and verify watchlist saves
2. Test API endpoints: Open DevTools and check Network tab
3. Verify database persistence: Refresh and data should remain
4. Monitor first 24 hours for errors in logs

## Rollback
Keep previous build backed up:
```bash
cp dist/ dist.backup-$(date +%s)/
git checkout <previous-commit>
npm run build
npm start
```
