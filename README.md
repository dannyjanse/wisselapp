# Wisselapp - 6v6 Voetbal Coach Tool

Een app voor het beheren van wisselbeleid bij 6v6 voetbalwedstrijden.

## Features

- **8-speler scenario**: Gestructureerde wissels met 2 groepen van 4 posities
- **Timer management**: 40-minuten wedstrijd met 5-minuten wisselintervallen
- **Real-time positie tracking**: Live overzicht van veld en bank
- **Handmatige position swaps**: Wissel spelers binnen dezelfde groep
- **Keeper management**: Verschillende keepers per helft

## Tech Stack

- **Frontend**: Next.js 14 met TypeScript
- **Database**: PostgreSQL met Prisma ORM
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Validation**: Zod
- **Deployment**: Railway

## Development Setup

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd wisselapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Railway Deployment

### Prerequisites
- GitHub account
- Railway account (railway.app)

### Setup Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Railway Project Setup**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your wisselapp repository
   - Railway auto-detects Next.js

3. **Add PostgreSQL Database**
   - In Railway dashboard, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Database URL is automatically injected as `DATABASE_URL`

4. **Environment Variables**
   Railway automatically sets:
   - `DATABASE_URL` (from PostgreSQL service)
   - `NODE_ENV=production`

   Add these manually in Railway dashboard:
   ```
   NEXTAUTH_SECRET=your-random-secret-key
   NEXTAUTH_URL=https://your-app.railway.app
   ```

5. **Deploy**
   - Railway automatically deploys on push to main branch
   - Database migrations run automatically via `npm run build`

### Railway Configuration

The app includes:
- `railway.toml` - Railway deployment configuration
- `postinstall` script - Generates Prisma client on deploy
- Build command includes `prisma generate`

### Auto-Deploy

Every push to `main` branch triggers:
1. Automatic build with Prisma client generation
2. Database migrations (if any)
3. Deployment to production URL

## Project Structure

```
wisselapp/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   ├── lib/           # Utilities & Prisma client
│   ├── stores/        # Zustand state management
│   └── types/         # TypeScript definitions
├── prisma/
│   └── schema.prisma  # Database schema
├── docs/              # Documentation
└── railway.toml       # Railway config
```

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run migrations
npm run db:generate  # Generate Prisma client

# Code Quality
npm run lint         # ESLint check
```

## Deployment Status

✅ **Phase 1 Complete**: Foundation setup with Railway deployment
- Next.js + TypeScript project
- Prisma with PostgreSQL
- Basic UI with Tailwind
- Auto-deploy pipeline

🚧 **Next**: Pre-game setup interface (Phase 2)
