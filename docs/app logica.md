# App logica Wisselapp - 6v6 Voetbal

## Project Overview
Voetbalwisselapp voor coach van 6v6 team ter ondersteuning van gestructureerd wisselbeleid.

## Fase-indeling (Game Type Isolation)
- **Fase 1**: 8-speler scenario (prioriteit)
- **Fase 2**: 7-speler scenario (later)

---

## FASE 1: 8-Speler Scenario

### Spel Specificaties
- **Veldspelers**: 6 actief op veld
- **Totaal spelers**: 8
- **Wedstrijdduur**: 40 minuten (2 x 20 min)
- **Wisselinterval**: Elke 5 minuten
- **Totaal wissels**: 8 wisselmomenten per wedstrijd

### Posities (8 totaal)
1. **Keeper** (roteert per helft)
2. **Linksachter**
3. **Rechtsachter**
4. **Midden**
5. **Linksvoor**
6. **Rechtsvoor**
7. **Wissel1**
8. **Wissel2**

### Wisselgroep Logica

#### Groep Samenstelling
- **2 wisselgroepen per wedstrijd**
- **Elke groep = 4 spelers + 4 posities**
- **Posities per groep vari�ren per wedstrijd** (coach kiest)

#### Wisselregels
1. **Keeper Regel**: Keeper zit altijd in een wisselgroep mee
2. **Wissel Regel**: Wissel1 en Wissel2 NOOIT in dezelfde groep
3. **Keeper Rotatie**: Andere keeper per helft (1e helft ` 2e helft keeper)
4. **Interne Rotatie**: Binnen elke groep rouleren spelers door de 4 toegewezen posities

#### Rotatie Algoritme (Automatisch - elke 5 min)
```
Elke 5 minuten binnen groep:
- Speler op positie 1 � positie 2
- Speler op positie 2 � positie 3
- Speler op positie 3 � positie 4
- Speler op positie 4 � positie 1

Bij keeper in groep:
- Keeper blijft keeper tot helftijd
- Andere 3 spelers rouleren door 3 veldposities
```

### Wissel Types

#### 1. Automatische Rotatie (5-minuten interval)
- **Trigger**: Timer bereikt 5-minuten mark
- **Scope**: Alle spelers binnen groep rouleren naar volgende positie
- **Effect**: Volledige groep rotatie volgens schema

#### 2. Handmatige Positiewissel (Real-time)
- **Trigger**: Coach sleept speler naar andere positie op display
- **Scope**: Alleen twee spelers binnen dezelfde wisselgroep
- **Validatie**:
  - Beide spelers moeten uit dezelfde groep komen
  - Kan alleen tussen toegewezen groepsposities
  - Keeper kan alleen wisselen met andere keeper uit groep (tot helftijd)
- **Effect**: Direct positiewisseling, geen impact op 5-min rotatieschema

### Pre-Wedstrijd Setup
1. **Spelers Toewijzen**: 8 spelers selecteren uit beschikbare squad
2. **Keepers Kiezen**:
   - 1e helft keeper (0-20 min)
   - 2e helft keeper (20-40 min)
3. **Groepen Samenstellen**:
   - Groep 1: 4 spelers + 4 posities kiezen
   - Groep 2: 4 spelers + 4 posities kiezen
4. **Validatie**:
   - Wissel1 en Wissel2 in verschillende groepen
   - Elke keeper toegewezen aan een groep
   - Alle 8 posities verdeeld over 2 groepen

### Live Wedstrijd Logica

#### Timer Management
- **Wedstrijdklok**: 0-40 minuten hoofd timer
- **Wisselinterval**: 5-minuten countdown per rotatie
- **Helftijd Detectie**: Automatische keeper wissel op 20 minuten
- **Pause/Resume**: Mogelijkheid om timer te stoppen

#### Display State Management
- **Huidige Opstelling**: Real-time veld + bank posities
- **Groep Identificatie**: Visuele scheiding tussen groep 1 en groep 2
- **Drag & Drop Zones**: Interactieve positie-wisseling binnen groepen
- **Volgende Rotatie Preview**: Toon aankomende 5-min wissel

#### Interactie Flows

**Handmatige Positiewissel:**
1. Coach selecteert speler op display
2. Coach sleept naar andere positie
3. Validatie: Zelfde groep check
4. Bevestiging dialog: "Wissel [Speler A] en [Speler B] van positie?"
5. Update display + log actie

**Automatische Rotatie:**
1. 5-min timer bereikt 0:00
2. Visuele/audio melding: "Tijd voor rotatie Groep X"
3. Preview tonen van aankomende wissels
4. Coach bevestigt of stelt uit
5. Execute rotatie + reset timer

### App Functionaliteiten

#### Pre-Wedstrijd Interface
- **Squad Selectie**: 8 spelers kiezen uit volledige spelerslijst
- **Keeper Assignment**: Drag & drop keepers naar 1e/2e helft
- **Groep Builder**:
  - Visual groep samensteller (spelers + posities)
  - Real-time validatie van regels
  - Preview van rotatie volgorde
- **Opstelling Test**: Simuleer eerste opstelling

#### Live Wedstrijd Interface
- **Timer Display**:
  - Hoofdtimer (wedstrijdtijd)
  - Afteltimer (tot volgende rotatie)
  - Helftijd indicator
- **Veld Layout**:
  - 6 veldposities + 2 bank posities
  - Groep kleurcodering (groep 1 = blauw, groep 2 = rood)
  - Drag & drop functionaliteit
- **Control Panel**:
  - Pause/Resume timer
  - Handmatige rotatie trigger
  - Wissel geschiedenis
- **Next Up Preview**: Wie komt waar bij volgende rotatie

#### Logging & Overzicht
- **Wissel Log**: Chronologische lijst van alle wissels
- **Speeltijd Tracking**: Minuten per speler per positie
- **Groep Performance**: Statistieken per wisselgroep
- **Wedstrijd Summary**: Totaal overzicht na wedstrijd

### Validatie Regels

#### Pre-Wedstrijd
- Alle 8 spelers uniek toegewezen
- Beide keepers in verschillende groepen
- Wissel1 en Wissel2 gescheiden
- Alle 8 posities verdeeld over 2 groepen (4+4)

#### Live Wedstrijd
- Handmatige wissel alleen binnen zelfde groep
- Keeper kan alleen wisselen binnen groep (en alleen voor helftijd)
- Geen speler kan op 2 posities tegelijk staan
- Bank moet altijd 2 spelers hebben (Wissel1 + Wissel2)

### Edge Cases
- **Late Speler**: Speler komt te laat, groep herindeling
- **Blessure**: Speler valt uit, groep aanpassing
- **Keeper Blessure**: Noodkeeper uit veld spelers
- **Timer Issues**: Handmatige tijd correctie
- **Verkeerde Wissel**: Undo functionaliteit

---

**Status: Logica volledig uitgewerkt - wacht op goedkeuring voor implementatie**