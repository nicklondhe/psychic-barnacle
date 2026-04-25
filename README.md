# 75 Hard Lifestyle Tracker

A personal mobile-first web app to track the 75 Hard challenge. All data lives locally on your device (IndexedDB) — Vercel only hosts the UI and the Claude food analysis endpoint.

## Features

- **Dashboard** — Day number, all 6 goal cards, daily check-in toggles
- **Water** — Log glasses (400ml each), goal 4,000ml/day
- **Reading** — Track multiple books, log sessions, reading speed & streaks
- **Workouts** — Log outdoor (walk/run/bike) and strength sessions
- **Diet & Protein** — Log food manually or snap a photo for AI protein analysis
- **Progress Photos** — Daily camera capture, stored privately on-device

## The 6 Rules

| # | Rule | Daily Goal |
|---|------|-----------|
| 1 | Water | 4,000ml (10 × 400ml) |
| 2 | Reading | 10 pages |
| 3 | Outdoor workout | 1 session |
| 4 | Strength workout | 1 session |
| 5 | Protein | 175g |
| 6 | Progress photo | 1 photo |

Challenge started: **2026-04-25**

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd psychic-barnacle
npm install
```

### 2. Create a Vercel project

Import this repo at [vercel.com/new](https://vercel.com/new).

### 3. Set one environment variable

In Vercel project settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com](https://console.anthropic.com) |

### 4. Deploy

```bash
git push origin master
```

Vercel deploys automatically. No database setup needed — data is stored in your phone's browser (IndexedDB).

## Local development

```bash
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY
npm run dev
```

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Dexie.js** — IndexedDB wrapper, all data on-device
- **Tailwind CSS** + **lucide-react**
- **@anthropic-ai/sdk** — Claude vision for food photo analysis
