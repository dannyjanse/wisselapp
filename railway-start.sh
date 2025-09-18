#!/bin/bash
echo "🚀 Railway startup script..."

# Check if migration table exists
echo "📊 Checking migration status..."
npx prisma migrate status || echo "Migration status check failed, continuing..."

# Mark existing migration as applied (don't re-run)
echo "✅ Marking init migration as resolved..."
npx prisma migrate resolve --applied 20250918110754_init || echo "Resolve failed, continuing..."

# Deploy any new migrations only
echo "🔄 Deploying new migrations only..."
npx prisma migrate deploy || echo "Migrate deploy failed, continuing..."

echo "🌐 Starting Next.js application..."
npm run start:force