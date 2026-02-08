# Research: Kindle Notes Website

**Date**: 2026-02-04  
**Scope**: Technical decisions for static site implementation  
**Goal**: Resolve NEEDS CLARIFICATION markers from plan.md Technical Context

## Research Outcomes

### Static Site Generator Choice

**Decision**: Astro  
**Rationale**: Perfect alignment with constitution principles and technical requirements:
- **Bundle Size**: Ships 0KB JavaScript by default, allows selective hydration to stay <200KB
- **KISS Compliance**: Simpler than React-based solutions, built-in TypeScript, minimal config
- **UI-First Support**: Excellent for static design systems, progressive enhancement model
- **Client-side Processing**: Direct Web API access for file parsing, search, image generation
- **Performance**: Designed for 90+ Lighthouse scores, automatic optimizations

**Alternatives Considered**:
- Next.js SSG: React runtime overhead (40-60KB) makes <200KB challenging
- Vite: Excellent control but requires extensive custom tooling setup  
- Vanilla: Maximum performance but high development overhead for features

### Testing Framework Choice

**Decision**: Vitest + Playwright  
**Rationale**:
- **Vitest**: Native Vite integration, fast unit tests for parsing/storage logic
- **Playwright**: End-to-end testing for file upload, search, sharing workflows
- **Combined Size**: <50KB development dependencies, aligns with minimal complexity

**Testing Strategy**:
- Unit: File parsers, search algorithms, image generation functions
- Integration: IndexedDB operations, component interactions
- E2E: Full user journeys (upload → organize → search → share)

### Architecture Patterns

**Client-side Storage**: IndexedDB with Dexie.js wrapper (~45KB)
- Structured data storage for notes, books, tags
- Offline-first architecture, no backend sync required
- Full-text search indexing with MiniSearch (~25KB)

**File Processing**: 
- Browser File API for Kindle export parsing
- Web Workers for large file processing (>1MB)
- Client-side validation and error handling

**Image Generation**:
- HTML5 Canvas API for Instagram Story export
- CSS-based layout rendering to canvas
- Text measurement and typography handling

**Progressive Web App**:
- Service Worker for offline functionality
- Installable app experience
- Background sync for enhanced UX

## Implementation Priorities

### Phase 0 Foundation
1. Astro project setup with TypeScript
2. Kindle-inspired design system (CSS custom properties)
3. Basic routing structure (index, library, search pages)
4. Core data models (Note, Book, User types)

### Phase 1 Core Features  
1. File upload with Kindle notes parsing
2. IndexedDB storage layer with Dexie.js
3. Basic notes organization (by book, by page)
4. Responsive design implementation

### Phase 2 Enhanced UX
1. Fast search with MiniSearch integration
2. Filtering and sorting capabilities
3. Note editing and tagging interface  
4. Error handling and empty states

### Phase 3 Sharing
1. Twitter message formatting with truncation
2. Instagram Story image generation (Canvas API)
3. Export/download capabilities
4. Social media copy-to-clipboard

## Technical Decisions Summary

| Component | Choice | Bundle Impact | Rationale |
|-----------|--------|---------------|-----------|
| Framework | Astro | ~15KB | Zero JS default, Islands architecture |
| Testing | Vitest + Playwright | Dev only | Native integration, comprehensive coverage |
| Search | MiniSearch | ~25KB | Fast client-side, small footprint |
| Storage | Dexie.js | ~45KB | Robust IndexedDB wrapper |
| PWA | @astrojs/pwa | ~10KB | Native Astro integration |
| **Total** | **~95KB** | **<200KB target ✅** | Leaves 105KB for application code |

## Alignment with Constitution

- **I. UI-First**: Astro excels at static design, progressive enhancement model
- **II. KISS**: Minimal dependencies, built-in features, simple deployment
- **III. Minimal Backend**: Pure static site, no server requirements
- **IV. Security**: Client-side only, no auth complexity initially
- **V. Intuitive**: Fast performance enables smooth UX, Kindle-inspired design