# PowerShell script to upload to GitHub
# Make sure Git is installed first

Write-Host "Initializing Git repository..." -ForegroundColor Green
git init

Write-Host "Adding all files..." -ForegroundColor Green
git add .

Write-Host "Creating initial commit..." -ForegroundColor Green
git commit -m "Initial commit: SA Ads Dashboard with fixed registration system

Features:
- Fixed database connection string
- Updated Prisma schema with username and password fields
- Working user registration system
- Next.js 15 with Turbopack
- Authentication with NextAuth.js
- Dashboard UI components
- Admin, Analytics, Monitor pages"

Write-Host "Adding remote repository..." -ForegroundColor Green
git remote add origin https://github.com/newgate0424/sa-ads.git

Write-Host "Pushing to GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host "Upload completed!" -ForegroundColor Green
Write-Host "Repository URL: https://github.com/newgate0424/sa-ads" -ForegroundColor Cyan
