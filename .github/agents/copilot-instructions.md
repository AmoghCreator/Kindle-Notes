# kindle-notes-website Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-04

## Active Technologies
- TypeScript (JavaScript ES2022) + Astro 5.17.1, Dexie 4.3.0, Minisearch 7.2.0 (002-kindle-txt-parser)
- IndexedDB (via Dexie.js) with JSON-based models (002-kindle-txt-parser)
- TypeScript 5.x (Node.js 18+) + Astro 5.17.1 (static site generator with SSR support), MiniSearch 7.2.0 (search - retained) (003-server-side-storage)
- File-based JSON storage in `/data` directory (books.json, notes.json) (003-server-side-storage)
- TypeScript (ES2022+) via Astro 5.17.1 + Astro (SSG framework), MiniSearch (client-side search) (004-highlight-note-link)
- JSON files (`data/books.json`, `data/notes.json`, `data/uploads.json`) (004-highlight-note-link)

- TypeScript/JavaScript ES2022, HTML5, CSS3 (001-kindle-notes)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript/JavaScript ES2022, HTML5, CSS3: Follow standard conventions

## Recent Changes
- 004-highlight-note-link: Added TypeScript (ES2022+) via Astro 5.17.1 + Astro (SSG framework), MiniSearch (client-side search)
- 003-server-side-storage: Added TypeScript 5.x (Node.js 18+) + Astro 5.17.1 (static site generator with SSR support), MiniSearch 7.2.0 (search - retained)
- 002-kindle-txt-parser: Added TypeScript (JavaScript ES2022) + Astro 5.17.1, Dexie 4.3.0, Minisearch 7.2.0


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
