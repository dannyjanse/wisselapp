#!/bin/bash
echo "🚀 Starting Railway deployment..."
echo "📦 Running safe migration..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Database setup complete - data preserved!"
echo "🌐 Starting application..."
npm run start