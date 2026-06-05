# Sextacy Manager

Web app per la gestione del torneo "12 Ore" - Grugliasco Oratorio 2026.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL)
- **Tailwind CSS**
- **Vercel** (deploy)

---

## Setup in 5 passi

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto
2. Prendi nota di **Project URL** e **anon public key** (Settings → API)

### 2. Esegui lo schema SQL

1. Vai su **SQL Editor** nel dashboard Supabase
2. Copia e incolla il contenuto di `supabase/schema.sql`
3. Clicca **Run** — crea tabelle, RLS policies e dati iniziali

### 3. Crea l'utente admin

1. Vai su **Authentication → Users**
2. Clicca **Add user** → **Create new user**
3. Inserisci la tua email e una password sicura
4. Questo sarà l'unico account che può accedere all'app

### 4. Configura le variabili d'ambiente

Modifica `.env.local` con i tuoi dati Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Installa e avvia

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) — verrai reindirizzato al login.

---

## Deploy su Vercel

1. Pusha il codice su GitHub (rimuovi `.env.local` dal commit — è già in `.gitignore`)
2. Vai su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo
3. In **Environment Variables** aggiungi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clicca **Deploy**

---

## Funzionalità

| Pagina | URL | Descrizione |
|--------|-----|-------------|
| Dashboard | `/` | Lista partite, crea nuova partita |
| Formazione | `/match/[id]/lineup` | Selezione titolari e capitano |
| Live | `/match/[id]/live` | Timer, score, eventi in tempo reale |
| Riepilogo | `/match/[id]/summary` | Statistiche post-partita |
| Giocatori | `/players` | Statistiche torneo per giocatore |
| Classifica | `/standings` | Classifica manuale dei 2 gironi |

## Flusso partita

```
Crea partita → Formazione → LIVE (timer + eventi) → Fine partita → Riepilogo
```

## Struttura DB

```
players          — rosa Sextacy (7 giocatori)
matches          — partite (pending/live/done)
match_lineups    — formazione per partita
events           — eventi live (goal, giallo, cambio...)
player_stats     — statistiche aggregate per giocatore/partita
standings        — classifica manuale dei gironi
```

---

## Torneo

**Girone 1:** Sextacy · Cunico FC · GDB · Los Mantos · Porceddus FC  
**Girone 2:** Cerveza FC · scuadra · Ceres FC · Melanzony FC · Tempo Pazzo
