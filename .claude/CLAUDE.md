# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

Focus code analysis on: `src/`

Ignore directories: `node_modules`, `dist`, `build`

## Commands

```bash
npm run dev      # Dev server on port 3000 (0.0.0.0, accessible from local WiFi)
npm run build    # tsc + vite build
npm run preview  # Preview production build
```

No lint or test scripts configured.

## Architecture

**Stack**: Vite + React 18 + TypeScript + Framer Motion + Zustand (with `persist`)

### Navigation Model
`App.tsx` renders one of 5 screens based on `activeTab` in the global store. `BottomNav` drives tab switching. `AnimatePresence` handles screen transitions (opacity + x slide, 0.2s).

There is no router — navigation is purely state-driven via `useStore().setActiveTab()`.

### State (`src/store/useStore.ts`)
Single Zustand store with `persist` middleware (localStorage key: `mindfulness-store`, version 3). Persists user progress, records, diary, badges, premium status, and dark mode. Incrementing `version` clears existing localStorage.

Key derived logic lives inside actions (not selectors):
- `completeMeditation()` — updates streak, points, badges, records atomically
- `toggleDarkMode()` — sets `data-theme` attribute on `document.documentElement`

### Data (`src/data/sessions.ts`)
Static data only — no API calls. `SESSIONS`, `EMOTIONS`, `CATEGORIES` are exported constants. Types: `SessionCategory`, `SessionDuration`, `EmotionType`, `MeditationSession`.

### Screens
| Screen | Tab | Purpose |
|--------|-----|---------|
| `HomeScreen` | home | Emotion picker, recommendations, streak/stats, challenge |
| `ExploreScreen` | explore | Search + category/duration filter |
| `SessionScreen` | session | Meditation player with timer + breathing animation |
| `RecordScreen` | record | Calendar view, diary, emotion chart |
| `MyScreen` | my | Premium subscription, points, rewards, settings |

### Design Constraints (Toss 앱인토스 가이드라인)
- Brand color: `#5C6BC0` (Calm Indigo)
- Base resolution: 390×844px (iPhone 14)
- UX writing: 해요체 (polite Korean)
- No bottom sheet on entry, no forced CTAs, no interstitial ads
- Deeplink scheme: `maum-cham-gim`

### Freemium Model
- Free: 1 session/day, 5-min sessions only, 1 breathing type
- Premium: ₩4,900/month or ₩39,900/year (300+ sessions, 12 themes)
- Toss Points reward: 1,000P after 7-day streak (`claimReward()`)
- Session `isPremium: true` gates premium content; checked against `store.isPremium`
