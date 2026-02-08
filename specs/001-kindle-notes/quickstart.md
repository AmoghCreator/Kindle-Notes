# Quickstart Guide: Kindle Notes Website

**Target Audience**: Developers implementing the static site  
**Prerequisites**: Node.js 18+, basic TypeScript knowledge  
**Estimated Setup Time**: 15-30 minutes

## Project Overview

A static website for organizing and sharing Kindle notes/highlights with beautiful, Kindle-inspired UX. Built with Astro for optimal performance and client-side data processing.

### Key Features
- **Import**: Upload Kindle export files, auto-organize by book/page
- **Search**: Fast client-side search with filters and highlighting  
- **Share**: One-click Twitter messages and Instagram Story images
- **Offline**: Progressive Web App with local storage

### Architecture Summary
- **Frontend**: Astro + TypeScript, <200KB bundle
- **Storage**: IndexedDB for notes, localStorage for preferences
- **Processing**: Client-side file parsing, no backend required
- **Deployment**: Static hosting (Vercel, Netlify, GitHub Pages)

## Quick Setup

### 1. Initialize Project

```bash
# Create Astro project
npm create astro@latest kindle-notes-website
cd kindle-notes-website

# Select options:
# - TypeScript: Yes
# - Strict: Yes 
# - Install dependencies: Yes
```

### 2. Install Core Dependencies

```bash
# Production dependencies
npm install dexie minisearch

# Development dependencies  
npm install -D @astrojs/check @playwright/test vitest
```

**Bundle Impact**: ~70KB (Dexie: 45KB, MiniSearch: 25KB)

### 3. Project Structure Setup

```bash
# Create directory structure
mkdir -p src/{components/{upload,notes,search,sharing,layout},lib/{parsers,storage,search,export},styles,utils}
mkdir -p src/pages/api  
mkdir -p tests/{unit,e2e,fixtures}
mkdir -p public/assets/{icons,fonts}

# Core files
touch src/lib/types.ts
touch src/styles/kindle-theme.css
touch src/utils/validation.ts
```

### 4. Essential Configuration

**`astro.config.mjs`**:
```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [],
  output: 'static',
  build: {
    assets: 'assets'
  },
  vite: {
    optimizeDeps: {
      include: ['dexie', 'minisearch']
    }
  }
});
```

**`tsconfig.json`** (extend default):
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}
```

### 5. Core Type Definitions

**`src/lib/types.ts`**:
```typescript
// Core data types (excerpt)
export interface Note {
  id: string;
  bookId: string;
  text: string;
  location?: {
    page?: number;
    position?: string;
  };
  type: 'highlight' | 'note' | 'bookmark';
  tags: string[];
  createdAt: Date;
  lastModifiedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  noteCount: number;
  tags: string[];
  createdAt: Date;
}

// Re-export from data-model.md for full definitions
```

### 6. Basic Storage Layer

**`src/lib/storage/database.ts`**:
```typescript
import Dexie, { type Table } from 'dexie';
import type { Book, Note, Upload } from '@/lib/types';

export class NotesDatabase extends Dexie {
  books!: Table<Book, string>;
  notes!: Table<Note, string>;
  uploads!: Table<Upload, string>;

  constructor() {
    super('KindleNotesDB');
    this.version(1).stores({
      books: '++id, title, author, *tags, createdAt',
      notes: '++id, bookId, *tags, text, createdAt',
      uploads: '++id, filename, status, createdAt'
    });
  }
}

export const db = new NotesDatabase();
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
# Open http://localhost:4321
```

### 2. Key Development Commands

```bash
# Type checking
npm run astro check

# Build for production  
npm run build

# Preview production build
npm run preview

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e
```

### 3. Testing Setup

**`vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

**Sample Test** (`tests/unit/storage.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { NotesDatabase } from '@/lib/storage/database';

describe('Storage', () => {
  let db: NotesDatabase;

  beforeEach(async () => {
    db = new NotesDatabase();
    await db.delete();
    await db.open();
  });

  it('should create and retrieve a book', async () => {
    const book = await db.books.add({
      title: 'Test Book',
      author: 'Test Author',
      noteCount: 0,
      tags: [],
      createdAt: new Date()
    });
    
    const retrieved = await db.books.get(book);
    expect(retrieved?.title).toBe('Test Book');
  });
});
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. **Setup Complete** ✅ (This quickstart)
2. **Basic UI**: Landing page with Kindle-inspired design
3. **File Upload**: Component with drag-and-drop
4. **Storage**: Database layer with basic CRUD operations

### Phase 2: Core Features (Week 2)
1. **Parser**: Kindle export file parsing logic
2. **Organization**: Book/note display components
3. **Search**: Basic search with MiniSearch integration
4. **Responsive**: Mobile-first design implementation

### Phase 3: Enhanced UX (Week 3)
1. **Advanced Search**: Filters, sorting, pagination
2. **Editing**: Note editing and tagging interface
3. **Error Handling**: User-friendly error states
4. **Performance**: Optimization and loading states

### Phase 4: Sharing (Week 4)
1. **Twitter Export**: Message formatting with attribution
2. **Instagram Export**: Canvas-based image generation
3. **PWA**: Service worker and offline functionality
4. **Polish**: Final UX refinements

## Deployment Options

### Static Hosting (Recommended)

**Vercel** (Easiest):
```bash
npm install -g vercel
vercel deploy
```

**Netlify**:
```bash
npm run build
# Upload dist/ folder to Netlify dashboard
```

**GitHub Pages**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Performance Targets

- **Bundle Size**: <200KB initial load ✅
- **Lighthouse Score**: 90+ across all metrics
- **Core Web Vitals**: 
  - LCP: <2.5s
  - FID: <100ms  
  - CLS: <0.1

## Next Steps

1. **Review**: [data-model.md](data-model.md) for complete entity definitions
2. **Implement**: Start with Phase 1 foundation components
3. **Test**: Set up testing infrastructure early
4. **Design**: Create Kindle-inspired design system in CSS

**Questions?** Refer to constitution principles in `.specify/memory/constitution.md` for guidance on technical decisions.