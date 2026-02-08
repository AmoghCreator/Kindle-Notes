# Data Model: Kindle Notes Website

**Generated**: 2026-02-04  
**Context**: Static site with client-side storage (IndexedDB)  
**Source**: Extracted from [spec.md](spec.md) functional requirements

## Core Entities

### User
**Purpose**: Account holder and preference storage  
**Storage**: localStorage (minimal data) + optional sync service

```typescript
interface User {
  id: string;                    // UUID v4
  email?: string;                // Optional for auth
  displayName?: string;          // Optional display name
  preferences: UserPreferences;
  createdAt: Date;
  lastActiveAt: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultShareAttribution: boolean;
  defaultSharePrivacy: 'private' | 'public';
  importDupeHandling: 'skip' | 'replace' | 'merge';
  searchResultsPerPage: number;
}
```

**Validation Rules**:
- email must be valid format if provided
- preferences always have default values
- displayName max 50 characters

### Book
**Purpose**: Logical grouping for imported notes  
**Storage**: IndexedDB `books` table

```typescript
interface Book {
  id: string;                    // UUID v4
  title: string;                 // Required, from Kindle export
  author?: string;               // Optional, from Kindle export
  isbn?: string;                 // Optional identifier
  cover?: string;                // Base64 or URL to cover image
  noteCount: number;             // Computed: count of associated notes
  tags: string[];                // User-added categorization
  importSource: string;          // Original filename reference
  createdAt: Date;
  lastModifiedAt: Date;
}
```

**Relationships**:
- One Book → Many Notes (one-to-many)
- Indexed by: title, author, tags for search performance

**Validation Rules**:
- title required, max 200 characters
- author max 100 characters
- tags are trimmed, lowercase, max 20 tags per book
- noteCount auto-computed on insert/update

### Note
**Purpose**: Core content entity - highlights/notes from Kindle  
**Storage**: IndexedDB `notes` table (primary storage)

```typescript
interface Note {
  id: string;                    // UUID v4
  bookId: string;                // Foreign key to Book
  text: string;                  // The actual note/highlight content
  location?: NoteLocation;       // Page/position information
  type: 'highlight' | 'note' | 'bookmark';
  tags: string[];                // User-added tags for organization
  userNote?: string;             // User's additional commentary
  createdAt: Date;               // From Kindle export or import time
  lastModifiedAt: Date;          // Local edit timestamp
  importSource: UploadMeta;      // Reference to import session
  shareHistory: ShareRecord[];   // Tracking for shared versions
}

interface NoteLocation {
  page?: number;                 // Page number if available
  location?: number;             // Kindle location number
  chapter?: string;              // Chapter reference if parsed
  position?: string;             // Free-form position (e.g., "loc. 1234")
}

interface ShareRecord {
  platform: 'twitter' | 'instagram';
  sharedAt: Date;
  format: 'text' | 'image';
  attribution: boolean;
}
```

**Relationships**:
- Many Notes → One Book (many-to-one via bookId)
- Full-text search indexed on text, userNote, tags

**Validation Rules**:
- text required, max 5000 characters (Kindle limit handling)
- bookId must reference valid Book.id
- tags are trimmed, lowercase, max 50 per note
- userNote max 2000 characters

**State Transitions**:
- Created → [Edited] → [Shared] → [Archived]
- Edit updates lastModifiedAt
- Share appends to shareHistory
- Delete sets soft-delete flag (for sync)

### Upload
**Purpose**: Import session tracking and deduplication  
**Storage**: IndexedDB `uploads` table

```typescript
interface Upload {
  id: string;                    // UUID v4
  filename: string;              // Original uploaded file name
  fileSize: number;              // Size in bytes
  format: 'kindle-txt' | 'csv' | 'json';  // Detected format
  status: UploadStatus;
  counts: UploadCounts;
  errors: ParseError[];
  startedAt: Date;
  completedAt?: Date;
  userId?: string;               // If authenticated
}

type UploadStatus = 
  | 'pending' 
  | 'parsing' 
  | 'processed' 
  | 'failed';

interface UploadCounts {
  totalLines: number;
  notesCreated: number;
  booksCreated: number;
  duplicatesSkipped: number;
  errorsEncountered: number;
}

interface ParseError {
  line: number;
  message: string;
  context: string;               // The problematic line content
}
```

**Validation Rules**:
- filename required, original name preserved
- fileSize > 0, max 50MB client-side limit
- status transitions: pending → parsing → (processed|failed)

### ShareRequest (Ephemeral)
**Purpose**: Generated share artifacts, temporary storage  
**Storage**: sessionStorage (not persisted)

```typescript
interface ShareRequest {
  noteId: string;
  platform: 'twitter' | 'instagram';
  format: 'text' | 'image';
  attribution: AttributionSettings;
  generatedAt: Date;
  payload: SharePayload;
}

interface AttributionSettings {
  includeBook: boolean;
  includeAuthor: boolean;
  customPrefix?: string;
}

type SharePayload = TwitterPayload | InstagramPayload;

interface TwitterPayload {
  text: string;                  // Generated message
  truncated: boolean;            // If text was shortened
  charCount: number;             // Twitter character count
}

interface InstagramPayload {
  imageDataUrl: string;          // Base64 image for download
  dimensions: { width: number; height: number; };
  textLines: string[];           // Text breakdown for canvas
}
```

## Data Flow Patterns

### Import Flow
1. **Upload**: File → Parse → Validate format
2. **Extract**: Parse content → Books + Notes entities
3. **Deduplicate**: Check existing by text hash/book combination  
4. **Store**: Insert Books first, then Notes with foreign keys
5. **Index**: Update search indices for new content

### Search Flow  
1. **Query**: User input → normalize/tokenize
2. **Search**: Full-text search across Note.text, Note.userNote, Book.title
3. **Filter**: Apply Book, Tag, Date range filters
4. **Rank**: Sort by relevance, date, or user preference  
5. **Paginate**: Return results with pagination metadata

### Share Flow
1. **Select**: User selects Note + platform
2. **Generate**: Create ShareRequest with formatted payload
3. **Present**: Show preview with copy/download options
4. **Track**: Record ShareRecord in Note.shareHistory
5. **Cleanup**: Clear ephemeral ShareRequest after use

## Indexing Strategy

**Primary Indices**:
- Notes: `id` (primary), `bookId` (foreign), `text` (full-text)
- Books: `id` (primary), `title` (text search)
- Uploads: `id` (primary), `createdAt` (chronological)

**Composite Indices**:
- `[bookId, createdAt]` for book-specific note ordering
- `[tags, lastModifiedAt]` for tag-based browsing
- `[type, createdAt]` for filtering by note type

**Full-Text Search**:
- MiniSearch indices on Note.text, Note.userNote, Book.title
- Tag-based filtering with exact matching
- Fuzzy matching for typos in search queries