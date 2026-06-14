#!/bin/bash

# Unified Media Tracker - GitHub Setup Script
# This script helps you push your project to GitHub

echo "═══════════════════════════════════════════════════════════"
echo "  Unified Media Tracker - GitHub Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "ℹ️  GitHub CLI not found. Install from: https://cli.github.com"
    echo ""
    echo "Manual setup:"
    echo "1. Create a new repository on GitHub (https://github.com/new)"
    echo "2. Copy the HTTPS or SSH URL from your new repository"
    echo "3. Run these commands:"
    echo ""
    echo "   git remote add origin <your-repo-url>"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    exit 0
fi

echo "Creating repository on GitHub..."

# Create repo using GitHub CLI
read -p "Enter your GitHub username: " github_user
read -p "Enter repository name (default: tracker-main): " repo_name
repo_name=${repo_name:-tracker-main}
read -p "Repository description (default: Unified Media Tracker): " repo_desc
repo_desc=${repo_desc:-Unified Media Tracker}

# Create the repository
gh repo create "$repo_name" --public --description "$repo_desc" --source=. --remote=origin --push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Repository created and pushed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Set up GitHub Actions secrets for auto-deployment:"
    echo ""
    echo "   For Railway:"
    echo "   gh secret set RAILWAY_TOKEN"
    echo ""
    echo "   For Vercel:"
    echo "   gh secret set VERCEL_TOKEN"
    echo ""
    echo "   For Heroku:"
    echo "   gh secret set HEROKU_API_KEY"
    echo "   gh secret set HEROKU_APP_NAME"
    echo ""
    echo "2. View your repository: https://github.com/$github_user/$repo_name"
    echo "3. Enable GitHub Actions in your repository settings"
    echo ""
else
    echo "❌ Failed to create repository. Please try again manually."
    echo ""
    echo "Manual instructions:"
    echo "1. Go to https://github.com/new"
    echo "2. Create a new repository"
    echo "3. Run: git remote add origin <your-repo-url>"
    echo "4. Run: git push -u origin main"
fi
