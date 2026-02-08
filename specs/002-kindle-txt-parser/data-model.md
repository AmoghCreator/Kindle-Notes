# Data Model: Kindle Text File Parser

**Date**: February 8, 2026  
**Context**: Data structures for text file import with deduplication  

## Core Entities

### ImportSession
Tracks a single text file import operation for audit and rollback purposes.

**Fields**:
- `id: string` - Unique identifier for the import session
- `fileName: string` - Original filename of the imported text file  
- `fileSize: number` - Size of the imported file in bytes
- `startedAt: Date` - When the import began
- `completedAt: Date | null` - When the import finished (null if in progress)
- `status: ImportStatus` - Current status of the import
- `statistics: ImportStatistics` - Summary of import results

**Relationships**:
- One session can result in multiple books and notes
- Sessions are independent and can be rolled back individually

### ParsedTextEntry
Raw parsed entry from text file before deduplication processing.

**Fields**:
- `id: string` - Temporary identifier for tracking during processing
- `sessionId: string` - Reference to the import session
- `bookIdentifier: string` - Raw book title/author string from file
- `entryType: 'highlight' | 'note' | 'bookmark'` - Type of entry
- `content: string` - The actual highlight text or note content
- `location: string | null` - Page and/or location information
- `timestamp: Date` - When the note/highlight was created
- `parseIndex: number` - Order in which this entry was parsed from file

**Validation Rules**:
- `bookIdentifier` must not be empty
- `content` must not be empty for highlights and notes
- `timestamp` must be valid date
- `parseIndex` must be sequential within session

### DeduplicationResult
Result of comparing a parsed entry against existing data.

**Fields**:
- `parsedEntryId: string` - Reference to the parsed entry
- `decision: DeduplicationDecision` - What action was taken
- `existingNoteId: string | null` - ID of existing note if match found
- `similarity: number` - Similarity score for fuzzy matches (0-1)
- `conflictReason: string | null` - Explanation if manual review needed

**State Transitions**:
- `pending` → `exact_match` (skip entry)
- `pending` → `content_update` (update existing note)
- `pending` → `unique` (create new note)
- `pending` → `manual_review` (user decision required)

## Extended Entities

### EnhancedParseResult
Extends the existing `ParseResult` interface with deduplication information.

**Fields**:
- All existing `ParseResult` fields (books, notes, metadata)
- `duplicates: DuplicationReport` - Summary of deduplication actions
- `processingStats: ProcessingStatistics` - Performance metrics
- `sessionId: string` - Link to the import session

### DuplicationReport
Summary of deduplication decisions made during import.

**Fields**:
- `totalEntries: number` - Total entries processed
- `exactDuplicates: number` - Entries skipped as exact duplicates  
- `contentUpdates: number` - Existing notes updated with new content
- `manualReviews: number` - Entries requiring user decision
- `uniqueEntries: number` - New entries added to library
- `conflicts: ConflictSummary[]` - List of conflicts requiring attention

### ProcessingStatistics
Performance and processing metrics for monitoring and optimization.

**Fields**:
- `parseTimeMs: number` - Time spent parsing the text file
- `deduplicationTimeMs: number` - Time spent on duplicate detection
- `storageTimeMs: number` - Time spent writing to IndexedDB
- `totalTimeMs: number` - End-to-end processing time
- `memoryPeakMb: number` - Peak memory usage during processing
- `entriesPerSecond: number` - Processing throughput

## Enums and Types

### ImportStatus
```typescript
export type ImportStatus = 
  | 'starting'      // Import session created, not yet processing
  | 'parsing'       // Reading and parsing text file  
  | 'deduplicating' // Checking for duplicates
  | 'storing'       // Writing to IndexedDB
  | 'completed'     // Successfully finished
  | 'failed'        // Error occurred, see error details
  | 'cancelled'     // User cancelled the operation
```

### DeduplicationDecision
```typescript
export type DeduplicationDecision =
  | 'exact_match'    // Skip - identical entry already exists
  | 'content_update' // Update - same location, different content
  | 'unique'         // Add - no existing match found
  | 'manual_review'  // User decision needed for ambiguous match
```

### ConflictSummary
Details about entries requiring manual review.

**Fields**:
- `parsedEntry: ParsedTextEntry` - The entry causing conflict
- `candidates: Note[]` - Existing notes that might match
- `similarities: number[]` - Similarity scores for each candidate
- `userDecision: DeduplicationDecision | null` - User's choice (if made)

## Data Flow

### Import Process
1. **File Upload**: User selects text file → Create `ImportSession`
2. **Text Parsing**: Read file → Create `ParsedTextEntry` records
3. **Deduplication**: Compare against existing notes → Generate `DeduplicationResult`
4. **User Review**: Present conflicts → Collect user decisions
5. **Storage**: Apply decisions → Update existing Note/Book records
6. **Completion**: Update session status → Generate final report

### Deduplication Keys
```typescript
// Primary key for exact duplicate detection
export interface ExactMatchKey {
  bookTitle: string;
  bookAuthor: string;
  location: string;
  entryType: 'highlight' | 'note' | 'bookmark';
  contentHash: string; // SHA-256 of normalized content
}

// Secondary key for location-based fuzzy matching  
export interface LocationMatchKey {
  bookTitle: string;
  bookAuthor: string;
  location: string;
  entryType: 'highlight' | 'note' | 'bookmark';
}
```

### Storage Schema Extensions

#### Extended Book Model
Existing `Book` entity with additional tracking:

**New Fields**:
- `importSessions: string[]` - List of sessions that contributed to this book
- `lastImportAt: Date | null` - When this book was last updated via import

#### Extended Note Model
Existing `Note` entity with import tracking:

**New Fields**:
- `importedFrom: string | null` - Session ID if note came from text import
- `originalLocation: string | null` - Preserve original Kindle location string
- `lastUpdatedBy: 'user' | 'import'` - Track how note was last modified

## Relationships and Integrity

### Referential Integrity
- `ParsedTextEntry.sessionId` → `ImportSession.id`
- `DeduplicationResult.parsedEntryId` → `ParsedTextEntry.id`
- `DeduplicationResult.existingNoteId` → `Note.id` (nullable)
- `Note.importedFrom` → `ImportSession.id` (nullable)

### Cascading Operations
- Delete session → Archive associated parsed entries (soft delete)
- Book merge → Update all associated notes with new book ID
- Note update → Preserve import history metadata

### Index Strategy
Optimized for deduplication performance:

```typescript
// IndexedDB indexes for fast duplicate detection
const indexes = {
  importSessions: 'status, startedAt, fileName',
  parsedEntries: 'sessionId, bookIdentifier, parseIndex',
  notes: '[bookId+location+type], importedFrom, lastModifiedAt'
};
```

This data model supports efficient deduplication while maintaining audit trails and enabling rollback operations for import sessions.