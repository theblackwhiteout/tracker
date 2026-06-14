# GitHub Setup & CI/CD Guide

## Quick Setup

### Option 1: Using GitHub CLI (Easiest)

```bash
# Install GitHub CLI if you haven't already
# https://cli.github.com/

# Run the setup script
bash setup-github.sh
```

### Option 2: Manual Setup

1. **Create a repository on GitHub**
   - Go to https://github.com/new
   - Name: `tracker-main` (or your preferred name)
   - Description: `Unified Media Tracker`
   - Choose: Public (for open source) or Private
   - Click "Create repository"

2. **Add GitHub remote and push**
   ```bash
   git remote add origin https://github.com/yourusername/tracker-main.git
   git branch -M main
   git push -u origin main
   ```

3. **Verify**
   - Check https://github.com/yourusername/tracker-main
   - Should see all files and GitHub Actions workflows

## GitHub Actions CI/CD

This project includes 2 automated workflows:

### 1. Build & Test Workflow (`.github/workflows/build.yml`)

**Triggers on:** Push to `main` or `develop`, and Pull Requests

**What it does:**
- ✅ Installs dependencies
- ✅ Runs TypeScript linter (`npm run lint`)
- ✅ Builds the project (`npm run build`)
- ✅ Uploads build artifacts

**Status Badge:**
```markdown
[![Build & Test](https://github.com/yourusername/tracker-main/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/tracker-main/actions)
```

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers on:** Push to `main` branch only

**What it does:**
- ✅ Runs full build pipeline
- ✅ Deploys to Railway, Vercel, or Heroku (if secrets are configured)

## Setting Up Auto-Deployment

### Deploy to Railway (Recommended)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign in with GitHub
   - Create new project

2. **Generate Railway API Token**
   - Settings → Tokens
   - Create new token
   - Copy the token

3. **Add GitHub Secret**
   ```bash
   gh secret set RAILWAY_TOKEN -b "your-railway-token"
   ```

4. **Configure Railway Project**
   - Connect GitHub repo in Railway dashboard
   - Set environment variables:
     ```
     NODE_ENV=production
     JWT_SECRET=<generate: openssl rand -base64 32>
     ALLOWED_ORIGINS=your-railway-url.railway.app
     DATABASE_PATH=/tmp/tracker.db
     ```

5. **Auto-Deploy**
   - Push to `main` branch
   - GitHub Actions will automatically build and deploy to Railway

### Deploy to Vercel

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign in with GitHub

2. **Generate Token**
   - Settings → Tokens
   - Create token

3. **Add GitHub Secret**
   ```bash
   gh secret set VERCEL_TOKEN -b "your-vercel-token"
   ```

4. **Connect to Vercel**
   - In Vercel dashboard, import GitHub repo
   - Set environment variables

### Deploy to Heroku

1. **Create Heroku Account**
   - Go to https://heroku.com
   - Create new app

2. **Generate API Key**
   - Account Settings → API Key
   - Copy key

3. **Add GitHub Secrets**
   ```bash
   gh secret set HEROKU_API_KEY -b "your-heroku-api-key"
   gh secret set HEROKU_APP_NAME -b "your-app-name"
   ```

## GitHub Actions Badges

Add these to your README.md to show CI/CD status:

```markdown
[![Build & Test](https://github.com/yourusername/tracker-main/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/tracker-main/actions)
[![Deploy](https://github.com/yourusername/tracker-main/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/tracker-main/actions)
```

## Branch Strategy

### Recommended Workflow

```
main (production)
  ↓ (deploy to production)
develop (staging)
  ↓ (feature branches)
feature/* (individual features)
```

### Create Feature Branch

```bash
git checkout -b feature/my-feature develop
# Make changes
git push origin feature/my-feature
# Open Pull Request
```

## Secrets Management

### View Secrets

```bash
gh secret list
```

### Add Secret

```bash
gh secret set SECRET_NAME -b "secret-value"
```

### Delete Secret

```bash
gh secret delete SECRET_NAME
```

### Required Secrets for Production

| Secret | Purpose | Generator |
|--------|---------|-----------|
| `JWT_SECRET` | Token signing | `openssl rand -base64 32` |
| `RAILWAY_TOKEN` | Railway deployment | Railway dashboard |
| `VERCEL_TOKEN` | Vercel deployment | Vercel dashboard |
| `HEROKU_API_KEY` | Heroku deployment | Heroku dashboard |
| `HEROKU_APP_NAME` | Heroku app identifier | Your Heroku app name |

## Troubleshooting

### Build fails with TypeScript errors

```bash
npm run lint  # Check locally first
git push      # Fix errors before pushing
```

### Deployment not triggered

1. Check workflow file at `.github/workflows/deploy.yml`
2. Verify you're pushing to `main` branch
3. Check Actions tab for error logs

### Secrets not working

```bash
# Verify secret is set
gh secret list

# Re-set the secret
gh secret set SECRET_NAME -b "new-value"

# Check the workflow logs in GitHub Actions
```

## Useful Links

- GitHub Actions Docs: https://docs.github.com/en/actions
- Railway Deployment: https://railway.app/docs
- Vercel Deployment: https://vercel.com/docs
- Heroku Deployment: https://devcenter.heroku.com

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Set up GitHub Actions secrets
3. ✅ Make a test commit to trigger CI/CD
4. ✅ Verify build passes
5. ✅ Deploy to production
6. 🎉 Monitor your live app!
