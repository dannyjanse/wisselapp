# Implementatieplan Wisselapp

## Project Setup & Deployment

### 1) Repository & Deployment Pipeline
- **GitHub Repository**: Nieuwe repo voor wisselapp
- **Railway Deployment**: Auto-deploy bij push naar main branch
- **Environment**: Production op Railway, Development lokaal

### 2) Tech Stack
- **Next.js 14/15** (App Router) – Frontend + API routes
- **TypeScript** – Type safety
- **Prisma ORM** – Database management
- **PostgreSQL** (Railway managed) – Database
- **Tailwind CSS** – UI styling
- **Zustand** of React Context – State management
- **Zod** – Schema validatie

### 3) Project Structure
```
wisselapp/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── pre-game/          # Pre-wedstrijd setup
│   ├── live/              # Live wedstrijd interface
│   └── dashboard/         # Overzicht & statistieken
├── components/            # Herbruikbare UI componenten
├── lib/                   # Utilities & helpers
├── prisma/               # Database schema & migrations
├── types/                # TypeScript type definitions
└── stores/               # Zustand stores
```

---

## Development Phases

### Phase 1: Foundation & Setup
**Goal**: Project basis + deployment pipeline

#### Setup Tasks
1. **Repository Initialisatie**
   - GitHub repo aanmaken
   - Next.js project setup
   - TypeScript configuratie

2. **Railway Deployment**
   - Railway account + GitHub koppeling
   - PostgreSQL database provisioning
   - Auto-deploy configuratie

3. **Database Setup**
   - Prisma schema design
   - Initial migrations
   - Seed data voor testing

4. **Basic UI Setup**
   - Tailwind installatie & configuratie
   - Component library basis
   - Layout structuur

**Deliverable**: Werkende deployment pipeline + basis project

---

### Phase 2: Data Models & Core Logic
**Goal**: Database schema + business logica

#### Data Models (Prisma Schema)
```prisma
model Player {
  id        String   @id @default(cuid())
  name      String
  number    Int?
  active    Boolean  @default(true)
  games     GamePlayer[]
}

model Game {
  id            String       @id @default(cuid())
  date          DateTime     @default(now())
  duration      Int          @default(40) // minuten
  status        GameStatus   @default(SETUP)
  players       GamePlayer[]
  rotations     Rotation[]
  groups        Group[]
}

model Group {
  id          String       @id @default(cuid())
  gameId      String
  name        String       // "Groep 1", "Groep 2"
  positions   String[]     // ["keeper", "linksachter", ...]
  game        Game         @relation(fields: [gameId], references: [id])
  players     GamePlayer[]
}

model GamePlayer {
  id        String    @id @default(cuid())
  gameId    String
  playerId  String
  groupId   String
  isKeeper1 Boolean   @default(false) // 1e helft keeper
  isKeeper2 Boolean   @default(false) // 2e helft keeper
  game      Game      @relation(fields: [gameId], references: [id])
  player    Player    @relation(fields: [playerId], references: [id])
  group     Group     @relation(fields: [groupId], references: [id])
}

model Rotation {
  id           String       @id @default(cuid())
  gameId       String
  timestamp    DateTime
  type         RotationType // AUTO, MANUAL
  groupId      String
  changes      Json         // position changes
  game         Game         @relation(fields: [gameId], references: [id])
}

enum GameStatus {
  SETUP
  ACTIVE
  PAUSED
  FINISHED
}

enum RotationType {
  AUTO
  MANUAL
}
```

#### Core Logic Implementation
1. **Group Validation Logic**
   - Wissel1/Wissel2 separation
   - Keeper distribution
   - Position allocation

2. **Rotation Algorithm**
   - 5-minute auto rotation
   - Manual position swapping
   - Keeper halftime switch

3. **Game State Management**
   - Timer logic
   - Position tracking
   - Validation rules

**Deliverable**: Werkende database + business logica

---

### Phase 3: Pre-Game Interface
**Goal**: Setup interface voor wedstrijd voorbereiding

#### Components
1. **Player Selection**
   - Squad picker (8 uit beschikbare spelers)
   - Drag & drop interface

2. **Keeper Assignment**
   - 1e/2e helft keeper selectie
   - Visual assignment interface

3. **Group Builder**
   - Visual group samensteller
   - Position assignment per groep
   - Real-time validatie

4. **Setup Validation**
   - Rule checking
   - Error messaging
   - Setup confirmation

#### API Routes
- `POST /api/games` - Create new game
- `PUT /api/games/[id]/setup` - Update game setup
- `GET /api/players` - Get available players
- `POST /api/games/[id]/validate` - Validate setup

**Deliverable**: Complete pre-game setup flow

---

### Phase 4: Live Game Interface
**Goal**: Real-time wedstrijd management

#### Timer System
1. **Game Timer**
   - 40-minute main timer
   - 5-minute rotation countdown
   - Pause/resume functionality

2. **Auto Rotation Triggers**
   - Rotation alerts
   - Preview next changes
   - Manual override options

#### Interactive Field Display
1. **Position Layout**
   - Visual field representation
   - Current player positions
   - Group color coding

2. **Drag & Drop System**
   - Manual position swapping
   - Group validation
   - Confirmation dialogs

3. **Live Updates**
   - Real-time state updates
   - Position change animations
   - Timer synchronization

#### API Routes
- `PUT /api/games/[id]/start` - Start game
- `PUT /api/games/[id]/timer` - Timer control
- `POST /api/games/[id]/rotate` - Execute rotation
- `PUT /api/games/[id]/swap` - Manual position swap
- `GET /api/games/[id]/state` - Current game state

**Deliverable**: Volledig werkende live interface

---

### Phase 5: Polish & Analytics
**Goal**: User experience verbetering + statistieken

#### UX Improvements
1. **Mobile Optimization**
   - Touch-friendly controls
   - Responsive design
   - Performance optimization

2. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - High contrast mode

#### Analytics Dashboard
1. **Game Statistics**
   - Speeltijd per speler
   - Position distribution
   - Rotation history

2. **Player Performance**
   - Games played
   - Preferred positions
   - Availability tracking

#### Data Export
- Game summaries
- Player statistics
- CSV/PDF export

**Deliverable**: Production-ready app

---

## Technical Implementation Details

### State Management (Zustand)
```typescript
interface GameStore {
  currentGame: Game | null
  timer: {
    gameTime: number
    rotationTime: number
    isRunning: boolean
  }
  positions: Record<string, Player | null>

  // Actions
  startGame: () => void
  pauseTimer: () => void
  executeRotation: () => void
  swapPositions: (pos1: string, pos2: string) => void
}
```

### API Architecture
- **RESTful design** met Next.js API routes
- **Type-safe** met Zod validation
- **Error handling** met consistent response format
- **Real-time updates** via polling (later websockets)

### Database Strategy
- **Prisma migrations** voor schema changes
- **Connection pooling** via Railway
- **Data backup** strategy
- **Performance monitoring**

---

## Deployment Strategy

### Railway Configuration
1. **Environment Variables**
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=...
   NEXTAUTH_URL=https://wisselapp.railway.app
   ```

2. **Build Commands**
   ```json
   {
     "build": "prisma generate && next build",
     "start": "next start",
     "migrate": "prisma migrate deploy"
   }
   ```

3. **Auto-Deploy Trigger**
   - Push naar `main` branch
   - Automatic database migrations
   - Health checks post-deployment

### Development Workflow
1. Feature branch development
2. Local testing met dev database
3. PR review + merge naar main
4. Automatic Railway deployment
5. Production testing

---

**Next Steps**: Repository setup + Railway deployment configuratie