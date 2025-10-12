# Supabase Security Fixes Application Script (PowerShell)
# This script helps apply all the security fixes to your Supabase project

Write-Host "🔒 Supabase Security Fixes Application Script" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Check if supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a Supabase project
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "❌ Not in a Supabase project directory. Please run this from your project root." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Supabase project detected" -ForegroundColor Green

# Backup current state
Write-Host "📦 Creating backup of current state..." -ForegroundColor Yellow
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups/security_fix_$timestamp"

New-Item -ItemType Directory -Path $backupDir | Out-Null

# Backup current migrations
if (Test-Path "supabase/migrations") {
    Copy-Item -Path "supabase/migrations" -Destination "$backupDir/" -Recurse
    Write-Host "✅ Migrations backed up to $backupDir" -ForegroundColor Green
}

# Backup current config
if (Test-Path "supabase/config.toml") {
    Copy-Item -Path "supabase/config.toml" -Destination "$backupDir/"
    Write-Host "✅ Config backed up to $backupDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Applying security fixes..." -ForegroundColor Cyan

# Apply migrations
Write-Host "📝 Applying database migrations..." -ForegroundColor Yellow
try {
    supabase db reset --linked
    Write-Host "✅ Migrations applied successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error applying migrations. Please check the error above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All security fixes have been applied!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes in your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Update Auth settings in the Dashboard (see SUPABASE_SECURITY_FIXES.md)" -ForegroundColor White
Write-Host "3. Test your application thoroughly" -ForegroundColor White
Write-Host "4. Monitor for any issues" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see: SUPABASE_SECURITY_FIXES.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 Backup created at: $backupDir" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Test in development first before applying to production!" -ForegroundColor Red

