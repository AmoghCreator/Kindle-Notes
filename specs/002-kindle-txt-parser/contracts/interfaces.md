# Interfaces: Kindle Text File Parser

**Date**: February 8, 2026  
**Context**: TypeScript interfaces for text file import functionality  

## Core Service Interfaces

### TextFileParserService
Primary service for parsing Kindle text files with deduplication.

```typescript
interface TextFileParserService {
  /**
   * Parse a text file containing Kindle notes and highlights
   * @param file The uploaded text file
   * @param options Configuration for parsing behavior
   * @returns Promise resolving to parse results with deduplication info
   */
  parseTextFile(
    file: File, 
    options?: ParseOptions
  ): Promise<EnhancedParseResult>;

  /**
   * Parse text content directly (for testing or programmatic use)
   * @param content Raw text content to parse
   * @param fileName Optional filename for metadata
   * @param options Configuration for parsing behavior
   */
  parseTextContent(
    content: string,
    fileName?: string, 
    options?: ParseOptions
  ): Promise<EnhancedParseResult>;

  /**
   * Validate a text file before parsing
   * @param file The file to validate
   * @returns Validation result with details
   */
  validateTextFile(file: File): Promise<ValidationResult>;

  /**
   * Cancel an in-progress parsing operation
   * @param sessionId The session to cancel
   */
  cancelParsing(sessionId: string): Promise<void>;
}
```

### DeduplicationService  
Service for detecting and handling duplicate content.

```typescript
interface DeduplicationService {
  /**
   * Check if a parsed entry is a duplicate of existing content
   * @param entry The entry to check
   * @param existingNotes Current notes in the system
   * @returns Deduplication decision and details
   */
  checkDuplicate(
    entry: ParsedTextEntry,
    existingNotes: Note[]
  ): Promise<DeduplicationResult>;

  /**
   * Build an index for fast duplicate detection
   * @param existingNotes All current notes in the system
   * @returns Optimized index for O(1) duplicate lookups
   */
  buildDeduplicationIndex(existingNotes: Note[]): DeduplicationIndex;

  /**
   * Calculate text similarity for fuzzy matching
   * @param text1 First text to compare
   * @param text2 Second text to compare
   * @returns Similarity score between 0 and 1
   */
  calculateTextSimilarity(text1: string, text2: string): number;

  /**
   * Resolve conflicts that require user input
   * @param conflicts List of conflicts to present to user
   * @returns User decisions for each conflict
   */
  resolveConflicts(conflicts: ConflictSummary[]): Promise<UserDecision[]>;
}
```

### ImportSessionService
Service for managing import sessions and audit trails.

```typescript
interface ImportSessionService {
  /**
   * Start a new import session
   * @param fileName Name of the file being imported
   * @param fileSize Size of the file in bytes
   * @returns New session identifier
   */
  createSession(fileName: string, fileSize: number): Promise<string>;

  /**
   * Update session status and statistics
   * @param sessionId Session to update
   * @param updates Status and statistics updates
   */
  updateSession(
    sessionId: string, 
    updates: Partial<ImportSession>
  ): Promise<void>;

  /**
   * Get details of an import session
   * @param sessionId Session identifier
   * @returns Session details
   */
  getSession(sessionId: string): Promise<ImportSession | null>;

  /**
   * List all import sessions
   * @param filters Optional filters for sessions
   * @returns Array of sessions matching criteria
   */
  listSessions(filters?: SessionFilters): Promise<ImportSession[]>;

  /**
   * Rollback changes from an import session
   * @param sessionId Session to rollback
   * @returns Summary of rollback operation
   */
  rollbackSession(sessionId: string): Promise<RollbackResult>;
}
```

## Configuration Interfaces

### ParseOptions
Configuration for parsing behavior and performance.

```typescript
interface ParseOptions {
  /** Whether to use strict parsing (reject malformed entries) */
  strictMode: boolean;
  
  /** Maximum number of parsing errors before stopping */
  maxErrors: number;
  
  /** Whether to attempt recovery of partially malformed entries */
  recoverPartialEntries: boolean;
  
  /** Size of processing chunks for large files (bytes) */
  chunkSize: number;
  
  /** Maximum concurrent worker threads */
  maxConcurrency: number;
  
  /** Callback for progress updates */
  onProgress?: (progress: ProgressUpdate) => void;
  
  /** Deduplication behavior configuration */
  deduplication: DeduplicationConfig;
}
```

### DeduplicationConfig
Configuration for duplicate detection behavior.

```typescript
interface DeduplicationConfig {
  /** Minimum similarity threshold for fuzzy matching */
  similarityThreshold: number;
  
  /** Whether to automatically update content at same location */
  autoUpdateContent: boolean;
  
  /** Whether to prompt user for ambiguous matches */
  promptForConflicts: boolean;
  
  /** Strategy for handling exact duplicates */
  exactMatchStrategy: 'skip' | 'update_timestamp' | 'prompt';
  
  /** Whether to deduplicate across import sessions */
  crossSessionDeduplication: boolean;
}
```

### ValidationResult
Result of text file validation before parsing.

```typescript
interface ValidationResult {
  /** Whether the file is valid for parsing */
  isValid: boolean;
  
  /** List of validation errors (if any) */
  errors: string[];
  
  /** List of warnings that don't prevent parsing */
  warnings: string[];
  
  /** Estimated number of entries in the file */
  estimatedEntries: number;
  
  /** Estimated processing time in milliseconds */
  estimatedProcessingTime: number;
  
  /** File format information */
  formatInfo: FileFormatInfo;
}
```

## Progress and Status Interfaces

### ProgressUpdate
Real-time progress information during parsing.

```typescript
interface ProgressUpdate {
  /** Session identifier */
  sessionId: string;
  
  /** Current processing stage */
  stage: ProcessingStage;
  
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  
  /** Progress within current stage (0-100) */
  stageProgress: number;
  
  /** Current processing statistics */
  currentStats: ProcessingStatistics;
  
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs: number;
  
  /** Most recent parsed entries (for preview) */
  recentEntries: ParsedTextEntry[];
}
```

### ProcessingStage
Enum for different stages of text file processing.

```typescript
type ProcessingStage = 
  | 'validating'      // Initial file validation
  | 'parsing'         // Converting text to structured data
  | 'deduplicating'   // Checking for duplicate content
  | 'resolving'       // Waiting for user conflict resolution
  | 'storing'         // Writing results to IndexedDB
  | 'completed'       // Processing finished successfully
  | 'failed'          // Processing failed with errors
```

## Event Interfaces

### ImportEventListener
Interface for listening to import events (for UI updates).

```typescript
interface ImportEventListener {
  /**
   * Called when import progress updates
   */
  onProgress(update: ProgressUpdate): void;

  /**
   * Called when conflicts require user resolution
   */
  onConflictsDetected(conflicts: ConflictSummary[]): void;

  /**
   * Called when import completes successfully
   */
  onImportComplete(result: ImportResult): void;

  /**
   * Called when import fails
   */
  onImportError(error: ImportError): void;

  /**
   * Called when import is cancelled
   */
  onImportCancelled(sessionId: string): void;
}
```

## Result Interfaces

### ImportResult
Final result of a text file import operation.

```typescript
interface ImportResult {
  /** Session identifier */
  sessionId: string;
  
  /** Summary of what was imported */
  summary: ImportSummary;
  
  /** Detailed deduplication report */
  duplicationReport: DuplicationReport;
  
  /** Performance statistics */
  processingStats: ProcessingStatistics;
  
  /** Any warnings that occurred during import */
  warnings: string[];
  
  /** List of conflicts that were resolved */
  resolvedConflicts: ResolvedConflict[];
}
```

### ImportSummary
High-level summary of import results.

```typescript
interface ImportSummary {
  /** Total entries processed from file */
  totalEntriesProcessed: number;
  
  /** Number of new books discovered */
  booksAdded: number;
  
  /** Number of existing books updated */
  booksUpdated: number;
  
  /** Number of new notes/highlights added */
  notesAdded: number;
  
  /** Number of existing notes updated */
  notesUpdated: number;
  
  /** Number of duplicates skipped */
  duplicatesSkipped: number;
  
  /** Number of entries that couldn't be processed */
  entriesFailed: number;
}
```

## Error Interfaces

### ImportError
Structured error information for failed imports.

```typescript
interface ImportError extends Error {
  /** Error type for categorization */
  type: ImportErrorType;
  
  /** Session where error occurred */
  sessionId: string;
  
  /** Processing stage when error occurred */
  stage: ProcessingStage;
  
  /** Additional error context */
  context: ErrorContext;
  
  /** Whether the operation can be retried */
  retryable: boolean;
}
```

### ImportErrorType
Categories of import errors for handling.

```typescript
type ImportErrorType = 
  | 'file_read_error'       // Failed to read uploaded file
  | 'invalid_format'        // File format not recognized  
  | 'parse_error'          // Error parsing file content
  | 'storage_error'        // Failed to write to IndexedDB
  | 'memory_exceeded'      // Ran out of available memory
  | 'timeout_exceeded'     // Processing took too long
  | 'user_cancelled'       // User cancelled the operation
  | 'unknown_error'        // Unexpected error occurred
```

## Factory Interface

### TextFileImportFactory
Factory for creating configured import services.

```typescript
interface TextFileImportFactory {
  /**
   * Create a parser service with default configuration
   */
  createParserService(): TextFileParserService;

  /**
   * Create a parser service with custom configuration
   */
  createParserService(config: ParseOptions): TextFileParserService;

  /**
   * Create a deduplication service
   */
  createDeduplicationService(): DeduplicationService;

  /**
   * Create an import session service
   */
  createSessionService(): ImportSessionService;

  /**
   * Create a complete import orchestrator
   */
  createImportOrchestrator(
    eventListener?: ImportEventListener
  ): TextFileImportOrchestrator;
}
```

This interface design supports a clean separation of concerns while providing flexible configuration options and comprehensive error handling for the text file import feature.