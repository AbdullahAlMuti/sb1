# Google Sheets Integration - Quick Deploy Script
# Run this script to deploy the Edge Function to Supabase

Write-Host "🚀 Google Sheets Integration - Deployment Script" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if user is logged in
Write-Host "📋 Step 1: Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = npx supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please login first:" -ForegroundColor Yellow
    Write-Host "  npx supabase login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Deploy the function
Write-Host "📋 Step 2: Deploying google_sheets_sync function..." -ForegroundColor Yellow
Write-Host ""

npx supabase functions deploy google_sheets_sync --project-ref ojxzssooylmydystjvdo

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to your app's Google Sheets settings" -ForegroundColor White
    Write-Host "2. Enter your Google Apps Script URL" -ForegroundColor White
    Write-Host "3. Click 'Test' to verify the connection" -ForegroundColor White
    Write-Host ""
    Write-Host "Dashboard: https://supabase.com/dashboard/project/ojxzssooylmydystjvdo/functions" -ForegroundColor Blue
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're logged in: npx supabase login" -ForegroundColor White
    Write-Host "2. Check your internet connection" -ForegroundColor White
    Write-Host "3. Verify project access permissions" -ForegroundColor White
    Write-Host ""
    exit 1
}
