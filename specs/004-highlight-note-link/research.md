# Research: Highlight-Note Association

**Feature**: 004-highlight-note-link  
**Phase**: 0 (Research & Discovery)  
**Date**: February 12, 2026

## Overview

This document captures research findings for implementing automatic association between Kindle highlights and notes when they appear sequentially in import files. Research focuses on three key areas: association detection patterns, UI grouping approaches, and storage strategies for linked entities.

## Research Areas

### 1. Association Detection Patterns

**Question**: How should the parser detect which notes belong to which highlights in a sequential file format?

**Decision**: Sequential position-based detection with type awareness

**Rationale**:
- Kindle export format places notes immediately after their associated highlights in the file
- Parser already processes entries sequentially and knows entry type (`highlight`, `note`, `bookmark`)
- Simple algorithm: If current entry is type `note` and previous entry is type `highlight` → create association
- Location data can serve as secondary validation (note location should be near highlight location)

**Implementation Approach**:
```typescript
// Pseudocode for association detection
const entries = parseKindleEntries(content);
let previousHighlight: ParsedHighlight | null = null;

for (const entry of entries) {
  if (entry.type === 'highlight') {
    previousHighlight = entry;
  } else if (entry.type === 'note' && previousHighlight !== null) {
    // Associate note with previous highlight
    entry.associatedHighlightId = previousHighlight.id;
    previousHighlight = null; // Reset to avoid multiple notes linking to same highlight
  } else {
    // Standalone note (no preceding highlight)
    previousHighlight = null;
  }
}
```

**Alternatives Considered**:
1. **Content-based similarity matching**: Use text analysis to match notes to highlights based on semantic similarity
   - Rejected: Too complex, violates KISS principle, unreliable for short notes
2. **Location-only matching**: Match notes to highlights within same location range
   - Rejected: Location ranges overlap frequently, could create false associations
3. **User manual linking**: Allow users to manually associate notes after import
   - Rejected: Adds UI complexity, most associations are already sequential in Kindle format

**Edge Cases Handled**:
- Multiple consecutive highlights before a note → only last highlight gets associated
- Note at beginning of file (before any highlights) → treated as standalone
- Highlight at end of file (no following note) → treated as standalone
- Multiple consecutive notes → all treated as standalone after first association

---

### 2. UI Grouping and Visual Display

**Question**: How should associated highlight-note pairs be displayed to make the relationship immediately clear?

**Decision**: Nested/indented layout with visual connectors

**Rationale**:
- Users need to see at a glance which notes comment on which highlights
- Indentation naturally suggests hierarchy (note belongs to highlight)
- Maintains existing card-based layout while adding relationship context
- Accessible: semantic HTML structures (`<article>` with nested `<aside>`) provide screen reader context

**Visual Design Pattern**:
```
┌─────────────────────────────────────┐
│ 📖 Highlight                         │  ← Highlight card (full width)
│ "The highlighted text passage..."   │
│ Location: Page 42, Position 123     │
│                                      │
│   ┌─────────────────────────────┐   │
│   │ 💭 My Note                   │   │  ← Note card (indented, with visual connector)
│   │ "My thoughts about this..."  │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💭 Standalone Note                   │  ← Standalone note (full width, no highlight)
│ "Independent thought..."             │
└─────────────────────────────────────┘
```

**Implementation Approach**:
- Use CSS classes to indicate relationship: `.note-card.associated` vs `.note-card.standalone`
- Indentation via CSS margin/padding (e.g., `margin-left: 2rem` for associated notes)
- Optional: subtle border-left or connecting line to show visual link
- Responsive: on mobile, reduce indentation but maintain visual grouping

**Alternatives Considered**:
1. **Accordion/collapsible pattern**: Hide notes under highlights, expand on click
   - Rejected: Adds interaction complexity, hides information by default
2. **Side-by-side layout**: Highlights on left, notes on right
   - Rejected: Poor mobile experience, wastes space when associations are sparse
3. **Popup/tooltip on hover**: Show note when hovering over highlight
   - Rejected: Not discoverable on mobile, violates "self-explanatory" principle
4. **Separate tabs**: "Highlights" and "Notes" tabs
   - Rejected: Breaks the association entirely, defeats the feature purpose

**Accessibility Considerations**:
- Use `<article>` for highlight card, `<aside>` for associated note (semantic relationship)
- ARIA labels: `aria-label="Note for highlight: [first few words]"`
- Keyboard navigation: Tab order flows highlight → note → next highlight
- Screen readers: Announce "Note associated with [highlight text]"

---

### 3. Storage Strategy for Linked Entities

**Question**: How should the association between highlights and notes be stored in JSON files?

**Decision**: Add optional `associatedHighlightId` field to Note type

**Rationale**:
- Minimal schema change: single optional field on existing Note interface
- Backward compatible: existing notes without associations continue to work
- Unidirectional reference: note points to highlight (not bidirectional)
- Simple queries: filter notes by `associatedHighlightId` to find standalone vs. associated
- No data migration required for existing JSON files

**Schema Extension**:
```typescript
interface Note {
  id: string;
  bookId: string;
  text: string;
  location?: NoteLocation;
  type: 'highlight' | 'note' | 'bookmark';
  tags: string[];
  userNote?: string;
  associatedHighlightId?: string;  // NEW: Optional reference to parent highlight
  createdAt: Date;
  lastModifiedAt: Date;
  importSource: UploadMeta;
  shareHistory: ShareRecord[];
}
```

**Query Patterns**:
```typescript
// Get all notes for a book
const allNotes = notes.filter(n => n.bookId === bookId);

// Separate standalone and associated notes
const standaloneNotes = allNotes.filter(n => !n.associatedHighlightId);
const associatedNotes = allNotes.filter(n => n.associatedHighlightId);

// Get note for a specific highlight
const highlightNote = allNotes.find(n => n.associatedHighlightId === highlightId);

// Group highlights with their notes
const groupedEntries = highlights.map(h => ({
  highlight: h,
  note: allNotes.find(n => n.associatedHighlightId === h.id)
}));
```

**Alternatives Considered**:
1. **Separate association table/file**: Create `associations.json` with `{ highlightId, noteId }` pairs
   - Rejected: Adds complexity, requires joining data across files, violates KISS
2. **Bidirectional reference**: Both highlight and note store references to each other
   - Rejected: Data duplication, synchronization risk, unnecessary for one-to-one relationship
3. **Nested storage**: Store notes as array within highlight objects
   - Rejected: Breaks existing structure, complicates standalone notes, harder to query
4. **Composite ID**: Use location-based compound keys to implicitly link entries
   - Rejected: Fragile, location conflicts possible, explicit reference is clearer

**Data Migration Strategy**:
- No migration needed: `associatedHighlightId` is optional
- Existing notes without the field are treated as standalone
- Future re-imports will populate the field for newly detected associations
- Users wanting to associate existing notes must re-import their Kindle file

---

## Technology Decisions

### Parsing Library

**Decision**: No additional parsing library needed

**Rationale**: Existing custom parser in `kindle-parser.ts` already handles Kindle format. Association detection is simple sequential logic that fits naturally into current parsing loop.

---

### UI Component Library

**Decision**: Continue with vanilla Astro components (no additional UI library)

**Rationale**: 
- Visual grouping achievable with CSS (indentation, borders, spacing)
- Existing component patterns (BookCard, NoteCard) support conditional rendering
- Keeps bundle size minimal (constitution constraint: <200KB gzip)
- No need for complex interactions (just static display with grouping)

---

### State Management

**Decision**: No state management library required

**Rationale**:
- Association data is static once parsed (no real-time updates)
- Astro SSG generates pages at build time with data already available
- Client-side hydration minimal (just for search, not for associations)
- Simple prop passing from page → component is sufficient

---

## Performance Considerations

### Parsing Performance

**Expected Impact**: Negligible (< 5ms added per 1000 entries)

**Reasoning**:
- Association detection adds one conditional check per entry
- No additional iterations over data (happens in existing parse loop)
- Reference assignment is O(1) operation

**Measurement Plan**: Add timing logs in parser for association phase

---

### Rendering Performance

**Expected Impact**: Minimal (< 20ms added for grouped layout)

**Reasoning**:
- Conditional CSS classes don't impact render performance
- No JavaScript required for grouping display (pure CSS)
- Nested HTML structure adds minimal DOM nodes (1-2 per association)

**Optimization Strategy**: Use CSS containment (`contain: layout style`) on note cards

---

### Storage Impact

**Expected Impact**: ~50 bytes per associated note (UUID reference + JSON overhead)

**Calculation**:
- UUID string: 36 characters = 36 bytes
- JSON field overhead: ~14 bytes (`"associatedHighlightId":""`)
- Total per note: ~50 bytes
- For 1000 associated notes: ~50KB additional storage

**Assessment**: Negligible impact. Existing `notes.json` for 1000 notes is ~500KB. 10% increase is acceptable.

---

## Open Questions Resolved

### Q1: Should associations be editable by users after import?

**Answer**: No, not in this feature (out of scope per spec).

**Reasoning**: 
- Adds significant UI complexity (edit mode, validation, save flow)
- Violates KISS principle for MVP
- Most users trust Kindle's sequential format
- Can be future enhancement if user feedback indicates need

---

### Q2: What if user wants to associate one note with multiple highlights?

**Answer**: Not supported in this feature (out of scope per spec).

**Reasoning**:
- Complicates data model (one-to-many relationship)
- Unclear UI representation (which highlights does note belong to?)
- Rare use case (Kindle format doesn't support this natively)
- Can be future enhancement if needed

---

### Q3: Should we preserve associations when notes are updated during re-import?

**Answer**: Yes, per FR-009 in spec.

**Implementation**: 
- Duplicate detection already compares location and text
- When updating existing note (same location), preserve `associatedHighlightId` if highlight still exists
- If associated highlight was deleted, clear the association

---

## Best Practices Applied

### TypeScript Type Safety

- Use strict null checks for `associatedHighlightId?: string`
- Type guards to distinguish standalone vs. associated notes
- Interface extension rather than type modification

### Accessibility

- Semantic HTML: `<article>` for highlights, `<aside>` for associated notes
- ARIA labels for screen readers
- Keyboard navigation support
- Sufficient color contrast for visual connectors

### Testing Strategy

- Unit tests for association detection logic
- Integration tests for parser output with associations
- E2E tests for UI rendering of grouped entries
- Visual regression tests for responsive grouping

---

## Summary

All research questions resolved with clear technical decisions that align with project constitution:

1. **Association Detection**: Sequential position-based with type awareness (KISS compliant)
2. **UI Display**: Nested/indented layout with visual connectors (UI-first, intuitive)
3. **Storage**: Optional field on Note type (minimal backend, backward compatible)

No additional dependencies required. All implementations use existing patterns and libraries. Feature ready for Phase 1 (data model and contracts).
