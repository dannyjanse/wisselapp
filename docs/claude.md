# Wisselapp - Claude Development Guide

## Development Workflow (MANDATORY)
1. **Think**: Analyze problem first
2. **Read**: Examine existing code
3. **Plan**: Use TodoWrite for all tasks
4. **Verify**: Get user approval
5. **Execute**: One step at a time
6. **Simplicity**: Minimal changes only

## Legacy Key Principles (Historical Context)
- **Game Type Isolation**: King of Court ↔ Partner Rotation completely separate
- **User Verification**: Always get approval before implementation
- **Step-by-Step**: Never rush multiple implementations
- **Organizer-Only**: Delete/edit restricted to organizers

## Project Overview

Wisselapp is een voetbal coach tool voor het beheren van wisselbeleid bij 6v6 voetbalwedstrijden. De app helpt coaches om speeltijden gelijk te verdelen tussen spelers door gestructureerde wissels en real-time tracking.

## Current Key Principles

- **Eerlijke speeltijd**: Alle spelers krijgen gelijke speeltijd door intelligente wisselvoorstellen
- **8-speler scenario**: Gestructureerde setup met 2 groepen van 4 spelers (3 veld + 1 wissel)
- **Real-time tracking**: Live timer en positie management tijdens wedstrijden
- **Keeper management**: Verschillende keepers per helft mogelijk

## Tech Stack

### Frontend
- **Next.js 14** met App Router
- **TypeScript** voor type safety
- **Tailwind CSS** voor styling
- **Zustand** voor state management
- **React 19** voor UI components

### Backend & Database
- **PostgreSQL** database
- **Prisma ORM** voor database interacties
- **Zod** voor validation

### Deployment
- **Railway** voor hosting (auto-deploy on main push)
- **GitHub** voor version control

## Development Workflow

⚠️ **Belangrijk**: We hebben nog geen werkende lokale dev omgeving. Alle development en testing gebeurt momenteel direct op productie.

### Deployment Process
1. Maak wijzigingen in code
2. Commit changes
3. Push naar `main` branch
4. Railway detecteert push en deployt automatisch
5. Test op productie URL

### Commands
```bash
# Linting (run before commit)
npm run lint

# Database operations (Railway handles automatically)
npm run db:migrate
npm run db:generate
```

## Project Structure

```
wisselapp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── players/           # Spelersbeheer
│   │   └── game/              # Wedstrijd flows
│   │       ├── new/           # Nieuwe wedstrijd setup
│   │       └── live/          # Live wedstrijd interface
│   ├── components/            # Herbruikbare React components
│   ├── lib/                   # Utilities & Prisma client
│   ├── stores/                # Zustand state management
│   └── types/                 # TypeScript definities
├── prisma/
│   └── schema.prisma          # Database schema
└── docs/                      # Documentatie
```

## Functionele Bouwblokken

### 1. Player Management (`/players`)
- CRUD operaties voor spelers
- Naam, rugnummer, actief/inactief status
- Database: `Player` model

### 2. Game Setup (`/game/new`)
- Selecteer 8 spelers uit beschikbare spelers
- Verdeel in 2 groepen van 4 (3 veld + 1 wissel)
- Wijs keepers toe voor 1e en 2e helft
- Bepaal initiële posities per groep
- Database: `Game`, `Group`, `GamePlayer` models

### 3. Live Match (`/game/live`)
- Real-time timer (40 min wedstrijd)
- Speeltijd tracking per speler
- Veld visualisatie met speler posities
- **Wissel modi**:
  - Handmatige wissels (klik spelers)
  - Voorgestelde wissels (automatisch op basis speeltijd)
  - Positie swaps binnen groepen
- Database: `Rotation` model voor wissel historie

### 4. State Management

#### Zustand Store (`gameStore.ts`)
- Huidige wedstrijd data
- Timer state (gameTime, rotationTime, isRunning)
- Speler posities op veld
- Acties voor timer en positie updates

#### Local Storage
- `currentMatch`: Wedstrijd setup data voor live page
- Persist tussen page refreshes

### 5. Database Models

#### Core Models
- **Player**: Basis speler informatie
- **Game**: Wedstrijd metadata (tijd, status, etc.)
- **Group**: Groep binnen wedstrijd (posities array)
- **GamePlayer**: Speler-wedstrijd koppeling (groep, keeper status)
- **Rotation**: Wissel historie (tijdstip, type, changes)

#### Enums
- **GameStatus**: SETUP, ACTIVE, PAUSED, FINISHED
- **RotationType**: AUTO, MANUAL

### 6. Position System

#### Veld Posities
- `keeper`: Doelman
- `linksachter`: Linker verdediger
- `rechtsachter`: Rechter verdediger
- `midden`: Middenveld
- `linksvoor`: Linker aanvaller
- `rechtsvoor`: Rechter aanvaller

#### Bank Posities
- `wissel1`, `wissel2`: Wisselspelers

## Common Tasks

### Fix Timer/Playing Time Issues
- Check `playingTimes` calculations in live page
- Ensure `lastSubTime` is properly initialized
- Verify `timeDiff` calculations use whole seconds (Math.floor)

### Add New Position Logic
- Update `Position` type in `types/game.ts`
- Modify field visualization in live page
- Update position mapping object

### Database Changes
- Update `schema.prisma`
- Generate migration: `npx prisma migrate dev`
- Deploy automatically handles migrations

### Styling Changes
- Use Tailwind classes
- Follow responsive design patterns (sm:, lg: prefixes)
- Maintain consistent color scheme (blue/green groups)

## Testing Strategy

Since we don't have local dev environment:
1. Test small changes on production
2. Use git branches for larger features (merge to main when ready)
3. Monitor Railway deployment logs for errors
4. Keep commits small and atomic for easy rollbacks

## Current Status

✅ **Phase 1 Complete**: Foundation setup with Railway deployment
- Basic CRUD for players
- Game setup flow
- Live match interface with timer
- Auto-deploy pipeline

🚧 **Active Development**:
- Bug fixes and UX improvements
- Timer precision and display issues
- Position swap enhancements

## Railway Specific Notes

- Auto-deploys on push to `main`
- Environment variables handled automatically
- PostgreSQL database URL injected
- Build process includes Prisma generation
- Logs available in Railway dashboard