# App Logica - Wisselapp (Actuele Implementatie)

## Algemeen overzicht

Wisselapp is een tool voor het beheren van wisselbeleid bij 6v6 voetbalwedstrijden. De app volgt een gestructureerde flow van speler selectie tot live wedstrijd management met focus op eerlijke speeltijd verdeling.

## Hoofdflow

### 1. Homepage (`/`)
- **Startpunt** met duidelijke navigatie naar:
  - Spelersbeheer (`/players`)
  - Nieuwe wedstrijd (`/game/new`)
- **Design**: Clean interface met logo en hoofdacties

### 2. Spelersbeheer (`/players`)
- **CRUD operaties** voor spelers
- **Velden**: naam, rugnummer (optioneel), actief/inactief status
- **Database**: Player model met Prisma ORM
- **Features**:
  - Toevoegen nieuwe spelers via modal form
  - Inline bewerken van bestaande spelers
  - Toggle actief/inactief status
  - Responsive lijst weergave

### 3. Nieuwe Wedstrijd Setup (`/game/new`)

#### Multi-step wizard proces:

#### Stap 1: Speler Selectie
- **Doel**: Selecteer exacte 8 actieve spelers uit beschikbare database
- **UI**: Checkbox interface met geselecteerde spelers teller
- **Validatie**: Precies 8 spelers vereist voor volgende stap
- **State**: LocalStorage `gameSetup` object voor persistence

#### Stap 2: Keeper Selectie
- **Doel**: Wijs keepers toe voor beide helften
- **Opties**:
  - Keeper 1e helft (verplicht)
  - Keeper 2e helft (verplicht, mag dezelfde zijn)
- **UI**: Dropdown/select interface uit geselecteerde 8 spelers
- **Validatie**: Beide keepers moeten gekozen zijn

#### Stap 3: Positie Toewijzing
- **Doel**: Verdeel 8 spelers over specifieke veldposities
- **Posities**:
  - **Veldposities** (6): keeper, linksachter, rechtsachter, midden, linksvoor, rechtsvoor
  - **Bankposities** (2): wissel1, wissel2
- **UI**: Visuele veld layout met drag & drop functionaliteit
- **Validatie**: Alle 8 posities moeten een speler toegewezen krijgen

#### Stap 4: Groep Indeling
- **Doel**: Verdeel 8 posities over 2 uitgebalanceerde groepen
- **Structuur**:
  - **Groep 1**: 3 veldposities + 1 wissel (vaak keeper + 2 veld + 1 wissel)
  - **Groep 2**: 3 veldposities + 1 wissel
- **Wissel regel**: Spelers kunnen alleen wisselen binnen hun groep
- **Finalisatie**: Opslaan naar database en automatische redirect naar live wedstrijd

### 4. Live Wedstrijd (`/game/live`)

#### Timer & Match Control Systeem
- **Wedstrijdduur**: 40 minuten standaard, aanpasbaar
- **Real-time tracking**: Seconde-nauwkeurige timer met visuele feedback
- **Match controls**:
  - Start/pause timer (▶️/⏸️)
  - Reset functie (🔄) - behoudt speeltijden
  - Handmatige tijd aanpassing (+/- 1 minuut knoppen)
- **Header display**: Prominente timer in header, altijd zichtbaar

#### Speeltijd Tracking Systeem
- **Automatisch**: +1 seconde per timer interval voor alle veldspelers
- **Individueel**: Nauwkeurige tracking per speler in MM:SS formaat
- **Groep specifiek**:
  - **Groep 1**: Posities 0-2 krijgen speeltijd (keeper + 2 veld)
  - **Groep 2**: Posities 0-2 krijgen speeltijd (3 veldspelers)
- **Real-time display**: Speeltijd zichtbaar onder elke speler

#### Veld Visualisatie & Interface
- **Field layout**: Realistische 6v6 voetbalveld representatie
- **Speler weergave**:
  - Gekleurde cirkels met positie labels
  - Groep 1: Blauw (`bg-blue-500`)
  - Groep 2: Groen (`bg-green-500`)
  - Wisselspelers: Lichtere tinten (`bg-blue-400`, `bg-green-400`)
- **Responsive design**: Aanpasbare cirkel grootte (`w-6 h-6` mobile, `sm:w-10 sm:h-10` desktop)
- **Interactive elements**: Hover effects, click feedback, visual state indicators

#### Wissel Systeem - Drie Modi

##### 1. Handmatige Directe Wissels
- **Trigger**: Click op elke speler (veld of bank)
- **Proces**:
  1. Eerste click → `substituteMode` geactiveerd (player krijgt ring highlight)
  2. Tweede click op andere speler → directe wissel uitvoering
  3. Cancel: click op dezelfde speler
- **Regels**:
  - Alleen binnen dezelfde groep toegestaan
  - Alle combinaties mogelijk: veld↔bank, veld↔veld, bank↔bank
  - Keeper kan gewisseld worden (geen speciale restricties)
- **Speeltijd impact**: Geen automatische aanpassing van speeltijden

##### 2. Intelligente Voorgestelde Wissels
- **Trigger**: "Wissel" knop bij groep suggestie sectie
- **Algoritme logic**:
  - **Te wisselen speler**: Veldspeler met MEESTE speeltijd
    - Groep 1: Exclusief keeper (posities 1-2 alleen)
    - Groep 2: Inclusief alle veldspelers (posities 0-2)
  - **Wissel kandidaat**: Bankspeler met MINSTE speeltijd
  - **Tie-breaking**: Bij gelijke speeltijden, alfabetische volgorde van naam
- **Speeltijd berekening**:
  - `timeDiff = Math.floor((Date.now() - lastSubTime) / 1000)`
  - Update alle huidige veldspelers met elapsed tijd
  - Reset `lastSubTime` na wissel
- **Database logging**: Automatische `Rotation` record met details

##### 3. Positie Swaps (Tactical Switches)
- **Trigger**: Click mode tussen 2 veldspelers
- **Doel**: Alleen positie wissel, geen bank involvement
- **Proces**:
  1. Click eerste veldspeler → `swapMode` active
  2. Click tweede veldspeler → swap posities in `group1Positions`/`group2Positions` arrays
- **Regels**:
  - Alleen tussen veldspelers (geen bank)
  - Alleen binnen dezelfde groep
- **Impact**: Geen speeltijd verandering, alleen positie update

#### Suggestie Interface
- **Visual design**: Aparte secties per groep met groep-specifieke kleuren
- **Information display**: "Volgende: [In-speler] → [Uit-speler]" format
- **Action buttons**: Prominente "Wissel" knoppen per groep
- **Fallback handling**: "Geen wissel mogelijk" bij onvoldoende spelers

## Data Architecture

### State Management Layers

#### 1. LocalStorage Persistence
```typescript
// Multi-step game setup state
gameSetup: {
  selectedPlayers: Player[]
  keeper1: Player | null
  keeper2: Player | null
  playerPositions: { [playerId]: position }
  positionGroups: { [position]: 1 | 2 }
  step: 'select-players' | 'select-keepers' | 'assign-positions' | 'create-groups'
}

// Live match runtime state
currentMatch: {
  selectedPlayers: Player[]
  keeper1: Player, keeper2: Player
  group1: Player[], group2: Player[] // ordered arrays per group
  group1Positions: string[], group2Positions: string[] // position mapping
  matchTime: number // elapsed seconds
  isMatchRunning: boolean
  half: 1 | 2 // match period
  executedSubstitutions: number[] // timestamps for tracking
  playingTimes: { [playerId]: number } // cumulative playing seconds
  lastSubTime: number // Date.now() for timeDiff calculations
}
```

#### 2. Zustand Global Store
```typescript
GameState: {
  currentGame: GameWithDetails | null
  timer: { gameTime, rotationTime, isRunning }
  positions: Record<Position, playerId | null>
  // Actions: setCurrentGame, updateTimer, startTimer, pauseTimer, etc.
}
```

#### 3. Database Schema (Prisma)
```sql
Player: id, name, number?, active, createdAt, updatedAt
Game: id, date, duration, status, gameTime, rotationTime, createdAt, updatedAt
Group: id, gameId, name, positions[], createdAt, updatedAt
GamePlayer: id, gameId, playerId, groupId, isKeeper1, isKeeper2, currentPosition?
Rotation: id, gameId, timestamp, gameTime, type, groupId?, changes (JSON)

Enums: GameStatus (SETUP, ACTIVE, PAUSED, FINISHED)
       RotationType (AUTO, MANUAL)
```

## Business Logic & Rules

### Keeper Management Logic
- **Groep 1 specials**:
  - Keeper altijd op array positie 0
  - Uitgesloten van automatische wissel suggesties
  - Handmatige wissel wel mogelijk
- **Groep 2 behandeling**:
  - Geen keeper op vaste positie
  - Alle 3 veldspelers wisselbaar via suggesties
- **Helft transitie**: Handmatige keeper wissel verantwoordelijkheid coach

### Groep Isolation & Constraints
- **Strikte scheiding**: Geen cross-group wissels mogelijk
- **Gebalanceerde setup**: Elke groep exact 3 veld + 1 wissel
- **Algoritme fairness**: Gebaseerd op groep-interne speeltijd distributie

### Timer Precision & Calculations
- **Interval tracking**: 1-seconde precisie voor alle berekeningen
- **Manual adjustments**: +/- minuten buttons passen proportioneel alle veldspeler tijden aan
- **Substitution timing**: `lastSubTime` timestamp voorkomt cumulatieve fouten
- **Float prevention**: `Math.floor()` voorkomt decimale seconden in display

## Navigation & User Experience

### Flow Architecture
```
/ (Homepage - entry point)
├── /players (Player CRUD management)
│   └── Modal forms for add/edit
└── /game/new (4-step wizard)
    ├── Step 1: Player selection (8 required)
    ├── Step 2: Keeper assignment
    ├── Step 3: Position mapping
    ├── Step 4: Group creation
    └── → /game/live (match execution)
        └── Back button → /game/new (reset flow)
```

### Responsive Design Strategy
- **Mobile-first**: Touch-friendly interface met adequate target sizes
- **Breakpoints**: `sm:` en `lg:` voor tablet/desktop enhancements
- **Sticky elements**: Header timer en footer navigation altijd toegankelijk
- **Visual feedback**: Hover states, loading indicators, success/error feedback

### Error Handling & Validation
- **Frontend validation**: Real-time feedback tijdens multi-step setup
- **Backend validation**: API route protection met Zod schemas
- **Graceful fallbacks**: LocalStorage corruption recovery
- **User feedback**: Clear error messages en success confirmations

## Technical Implementation Notes

### Performance Optimizations
- **Timer efficiency**: `setInterval` cleanup en memory leak prevention
- **Re-render optimization**: Zustand selective subscriptions
- **LocalStorage management**: Automatic cleanup bij navigation

### Railway Deployment Specifics
- **Auto-deploy**: Push naar `main` triggert Railway build
- **Environment**: Production-only development (geen lokale DB)
- **Database migrations**: Automatisch via Railway build process
- **State persistence**: LocalStorage kritiek voor user experience continuity

## Key Differences from Original Design

### Simplified Wissel Logic
- **Geen automatische 5-minuten rotaties**: Coach bepaalt wanneer te wisselen
- **Geen complexe rotatie algoritmes**: Simpele fairness based wissel suggesties
- **Manuele controle**: Coach heeft volledige controle over alle wissels

### Praktische Focus
- **Real-world usage**: Gebouwd voor echte coaching situaties
- **Flexibiliteit**: Handmatige override van alle automatische suggesties
- **Eenvoud**: Intuïtieve interface zonder complexe regels

### Modern Tech Implementation
- **Real-time updates**: Live timer en speeltijd tracking
- **Mobile responsive**: Optimaal voor sideline gebruik
- **Data persistence**: Robuuste state management tussen page refreshes