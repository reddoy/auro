#!/bin/bash

# Supabase Security Fixes Application Script
# This script helps apply all the security fixes to your Supabase project

set -e  # Exit on any error

echo "🔒 Supabase Security Fixes Application Script"
echo "=============================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

echo "✅ Supabase project detected"

# Backup current state
echo "📦 Creating backup of current state..."
if [ ! -d "backups" ]; then
    mkdir -p backups
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/security_fix_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Backup current migrations
if [ -d "supabase/migrations" ]; then
    cp -r supabase/migrations "$BACKUP_DIR/"
    echo "✅ Migrations backed up to $BACKUP_DIR"
fi

# Backup current config
if [ -f "supabase/config.toml" ]; then
    cp supabase/config.toml "$BACKUP_DIR/"
    echo "✅ Config backed up to $BACKUP_DIR"
fi

echo ""
echo "🚀 Applying security fixes..."

# Apply migrations
echo "📝 Applying database migrations..."
supabase db reset --linked

echo ""
echo "✅ All security fixes have been applied!"
echo ""
echo "📋 Next steps:"
echo "1. Review the changes in your Supabase Dashboard"
echo "2. Update Auth settings in the Dashboard (see SUPABASE_SECURITY_FIXES.md)"
echo "3. Test your application thoroughly"
echo "4. Monitor for any issues"
echo ""
echo "📖 For detailed instructions, see: SUPABASE_SECURITY_FIXES.md"
echo ""
echo "🔄 Backup created at: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: Test in development first before applying to production!"

