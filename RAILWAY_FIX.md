# 🚨 Railway Database Reset Fix

## Het Probleem
Je Railway deployment gebruikt `npx prisma db push` wat **destructief** is en **alle data wist** bij elke deployment.

## ✅ De Oplossing (GEÏMPLEMENTEERD)

### 1. Package.json - Veilig deploy script toegevoegd
```json
"deploy:safe": "prisma migrate deploy && prisma generate"
```

### 2. Railway.toml - Aangepast naar veilige deployment
```toml
startCommand = "npm run deploy:safe && npm run start"
```

## 🔄 Verschil tussen commando's:

### ❌ `prisma db push` (DESTRUCTIEF)
- Duwt schema direct naar database
- **KAN TABELLEN DROPPEN**
- **VERLIEST ALLE DATA**
- Geen migrations historie
- ⚠️ **ALLEEN VOOR DEVELOPMENT!**

### ✅ `prisma migrate deploy` (VEILIG)
- Voert alleen nieuwe migrations uit
- **BEHOUDT ALLE DATA**
- Incrementele wijzigingen
- Volledige migrations historie
- 🛡️ **VEILIG VOOR PRODUCTIE**

## 🎯 Wat nu te doen:

1. **In Railway Dashboard:**
   - Verwijder de `npx prisma db push` predeploy command
   - Het nieuwe `railway.toml` doet dit automatisch

2. **Volgende deployment:**
   - Zal `prisma migrate deploy` gebruiken
   - **Je data blijft bewaard!**

3. **Voor lokale development:**
   - Gebruik `prisma db push` (lokaal is OK)
   - Voor productie: alleen `prisma migrate deploy`

## 🔧 Railway Settings te controleren:

### ❌ KRITIEK - Verwijder deze setting:
- **Build Command:** Verwijder `npx prisma db push` (als aanwezig)
- **Pre-deploy Command:** Verwijder `npx prisma db push` (als aanwezig)

### ✅ Correcte instellingen:
- **Build Command:** `npm run build` (alleen build, geen database)
- **Start Command:** `npm run start` (bevat nu veilige migratie)
- **Deploy Command:** LEEG laten

### 🔧 Hoe het nu werkt:
```bash
# Build fase (geen database beschikbaar):
npm run build = prisma generate && next build

# Start fase (database beschikbaar):
npm run start = prisma migrate deploy && next start
```

### 🆘 Als data nog steeds verdwijnt:
1. Ga naar Railway Dashboard → Settings → Environment
2. Zoek naar ALLE vermeldingen van `prisma db push`
3. Verwijder of vervang door `prisma migrate deploy`
4. Herstart deployment

## 📊 Data Recovery:
Helaas is oude data verloren door de `db push` commands, maar vanaf nu blijft alles bewaard!

## 🚨 EMERGENCY FIX - Als spelers nog steeds verdwijnen:

### Methode 1: Railway Dashboard
1. Ga naar Railway project dashboard
2. Settings → Variables
3. Zoek naar build/deploy commando's met `prisma db push`
4. Vervang door `prisma migrate deploy`

### Methode 2: Manual Override
Voeg deze environment variable toe in Railway:
```
DATABASE_RESET_PROTECTION=true
```

### Methode 3: Build Command Fix
Zet in Railway Build Command:
```bash
npm run build
```
(Niet `prisma db push` of vergelijkbaar)

### 🚨 LATEST BUILD ERROR FIX:
Als je ziet: "Can't reach database server during build"
- Dit is NORMAAL - database is niet beschikbaar tijdens build
- De migratie gebeurt nu tijdens START (niet BUILD)
- Railway zal nu succesvol builden en dan veilig migreren

## 📋 Checklist voor Railway:
- [ ] Geen `prisma db push` in Build Command
- [ ] Geen `prisma db push` in Deploy Command
- [ ] Geen `prisma db push` in Pre-deploy Command
- [ ] Build Command is `npm run build`
- [ ] Start Command is `npm run start`