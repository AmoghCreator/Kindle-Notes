# Kindle Notes Website

A web application for managing, browsing, and sharing your Kindle highlights and notes — built with Astro.

## Features

### 📚 Kindle Notes Library
- Import notes from Kindle's `My Clippings.txt` file
- Browse highlights, notes, and bookmarks grouped by book
- Search across all your reading annotations
- Share highlights to Twitter/X with formatted quotes

### 📖 Reading Session Tracker
Track daily reading progress with per-book session logging.

- **Log sessions**: Record date, book, page range, and optional insight for each reading session
- **Canonical book matching**: Books are matched to Google Books metadata using a confidence scoring system (auto-link ≥ 0.90, user-confirm 0.70–0.89, provisional < 0.70)
- **Homepage tracker**: The library homepage shows your most recent session context (today → yesterday → latest → empty)
- **Streak tracking**: Current and longest streaks calculated from consecutive reading days
- **Per-book history**: Book detail pages show a timeline of all reading sessions alongside notes

#### How It Works
- Sessions and canonical book data are stored client-side in IndexedDB via [Dexie.js](https://dexie.org/)
- When you log a session or import Kindle notes, the book title is searched against the Google Books API
- Matches above 0.90 confidence are automatically linked; matches between 0.70–0.89 ask for confirmation; below 0.70 are provisionally recorded
- All matching decisions are audited with a `CanonicalLinkAudit` record for transparency
- Title variants (e.g. "1984" vs "Nineteen Eighty-Four") are unified through the alias system

### Data Storage
- **Server-side** (build-time): `data/books.json`, `data/notes.json` — populated from Kindle imports
- **Client-side** (runtime): IndexedDB tables for `readingSessions`, `canonicalBooks`, `bookAliases`, `syncMeta`

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`       |
| `npm run build`           | Build your production site to `./dist/`           |
| `npm run preview`         | Preview your build locally, before deploying      |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check`  |

## Project Structure

```text
src/
├── components/
│   ├── common/          # EmptyState, Modal, Toast, etc.
│   ├── layout/          # Header, Footer
│   ├── notes/           # BookCard, NoteCard
│   ├── sessions/        # ReadingSessionForm, ReadingSessionList
│   ├── sharing/         # RandomSuggestionCard
│   ├── tracker/         # ReadingTrackerHeader
│   └── upload/          # FileUpload
├── layouts/             # BaseLayout
├── lib/
│   ├── db/              # Dexie schema, bootstrap, repositories
│   ├── matching/        # Google Books client, canonicalize, audit
│   ├── parsers/         # Kindle parser, canonical import
│   ├── tracker/         # Streak, summary
│   └── utils/           # UI state, validation, errors
├── pages/
│   ├── index.astro      # Homepage with reading tracker header
│   ├── sessions.astro   # Reading session log page
│   ├── import.astro     # Kindle file import
│   └── books/[id].astro # Book detail with notes + sessions
└── styles/
    └── kindle-theme.css # Design system tokens
```

## Tech Stack

- **[Astro](https://astro.build/)** — Static site generator with islands architecture
- **[Dexie.js](https://dexie.org/)** — IndexedDB wrapper for client-side persistence
- **[Vitest](https://vitest.dev/)** — Unit testing
- **[Playwright](https://playwright.dev/)** — End-to-end testing
- **Google Books API** — Canonical book metadata lookup
