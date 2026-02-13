// Core data types for Kindle Notes Website
// Based on data-model.md specifications

export interface User {
    id: string;
    email?: string;
    displayName?: string;
    preferences: UserPreferences;
    createdAt: Date;
    lastActiveAt: Date;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    defaultShareAttribution: boolean;
    defaultSharePrivacy: 'private' | 'public';
    importDupeHandling: 'skip' | 'replace' | 'merge';
    searchResultsPerPage: number;
}

export interface Book {
    id: string;
    title: string;
    author?: string;
    isbn?: string;
    cover?: string;
    noteCount: number;
    tags: string[];
    importSource: string;
    createdAt: Date;
    lastModifiedAt: Date;
}

export interface Note {
    id: string;
    bookId: string;
    text: string;
    location?: NoteLocation;
    type: 'highlight' | 'note' | 'bookmark';
    tags: string[];
    userNote?: string;
    associatedHighlightId?: string; // T001: References associated highlight (for notes that follow highlights)
    createdAt: Date;
    lastModifiedAt: Date;
    importSource: UploadMeta;
    shareHistory: ShareRecord[];
}

export interface NoteLocation {
    start: number; // REQUIRED for deduplication
    end?: number;  // Optional end location for ranges
    page?: number;
    chapter?: string;
    position?: string;
}

// T002: Display entity for rendering grouped highlight-note pairs
export interface HighlightNotePair {
    highlight: Note & { type: 'highlight' };
    associatedNote?: Note & { type: 'note' };
    displayOrder: number;
}

// T003: Complete collection of entries for a book
export interface GroupedBookEntries {
    pairs: HighlightNotePair[];
    standaloneNotes: Note[];
    bookmarks: Note[];
}

export interface ShareRecord {
    platform: 'twitter' | 'instagram';
    sharedAt: Date;
    format: 'text' | 'image';
    attribution: boolean;
}

export interface Upload {
    id: string;
    filename: string;
    fileSize: number;
    format: 'kindle-txt' | 'csv' | 'json';
    status: UploadStatus;
    counts: UploadCounts;
    errors: ParseError[];
    startedAt: Date;
    completedAt?: Date;
    userId?: string;
}

export type UploadStatus = 'pending' | 'parsing' | 'processed' | 'failed';

export interface UploadCounts {
    totalLines: number;
    notesCreated: number;
    booksCreated: number;
    duplicatesSkipped: number;
    errorsEncountered: number;
}

export interface ParseError {
    line: number;
    message: string;
    context: string;
}

export interface UploadMeta {
    uploadId: string;
    filename: string;
    importedAt: Date;
}

// Share-related types
export interface ShareRequest {
    noteId: string;
    platform: 'twitter' | 'instagram';
    format: 'text' | 'image';
    attribution: AttributionSettings;
    generatedAt: Date;
    payload: SharePayload;
}

export interface AttributionSettings {
    includeBook: boolean;
    includeAuthor: boolean;
    customPrefix?: string;
}

export type SharePayload = TwitterPayload | InstagramPayload;

export interface TwitterPayload {
    text: string;
    truncated: boolean;
    charCount: number;
}

export interface InstagramPayload {
    imageDataUrl: string;
    dimensions: { width: number; height: number };
    textLines: string[];
}

// Parser interface types
export interface ParseResult {
    books: BookData[];
    notes: NoteData[];
    errors: ParseError[];
    summary: {
        totalLines: number;
        booksFound: number;
        notesFound: number;
        duplicatesDetected: number;
        associatedNotes?: number; // T004: Count of notes associated with highlights
        standaloneNotes?: number; // T004: Count of standalone notes
    };
}

export interface BookData {
    title: string;
    author?: string;
    isbn?: string;
}

export interface NoteData {
    text: string;
    bookTitle: string;
    location?: {
        page?: number;
        position?: string;
    };
    type: 'highlight' | 'note' | 'bookmark';
    timestamp?: Date;
}

export interface FileFormat {
    name: string;
    extensions: string[];
    mimeTypes: string[];
    description: string;
}

// Search-related types
export interface SearchQuery {
    text?: string;
    bookIds?: string[];
    tags?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    limit?: number;
    offset?: number;
}

export interface SearchResult {
    notes: Note[];
    totalCount: number;
    hasMore: boolean;
    suggestions?: string[];
}

// Export options
export interface TwitterOptions {
    includeAttribution: boolean;
    customPrefix?: string;
    maxLength?: number;
}

export interface InstagramOptions {
    includeAttribution: boolean;
    theme: 'light' | 'dark' | 'kindle';
    dimensions: {
        width: number;
        height: number;
    };
    font?: {
        family: string;
        size: number;
    };
}

export interface TwitterExport {
    text: string;
    charCount: number;
    truncated: boolean;
    hashtags: string[];
}

export interface InstagramExport {
    imageDataUrl: string;
    dimensions: { width: number; height: number };
    metadata: {
        text: string;
        attribution: string;
        theme: string;
    };
}

export type ShareableItemType = 'note' | 'highlight';

export interface ShareableItem {
    itemId: string;
    itemType: ShareableItemType;
    text: string;
    bookId: string;
    bookTitle: string;
    bookAuthor?: string;
    associatedHighlightId?: string;
    associatedHighlightText?: string;
}

export interface ShareTextPayload {
    text: string;
    charCount: number;
    truncated: boolean;
    includesAssociatedHighlight: boolean;
    attribution: string;
}

export interface RandomSuggestion {
    suggestionId: string;
    itemId: string;
    itemType: ShareableItemType;
    previewText: string;
    associatedHighlightId?: string;
    associatedHighlightText?: string;
    bookId: string;
    bookTitle: string;
    bookAuthor?: string;
    canShare: boolean;
}
// Server-side storage types for 003-server-side-storage

export interface DeduplicationResult {
    added: number;
    skipped: number;
    errors?: string[];
}

export interface UploadSession {
    id: string;
    filename: string;
    fileSize: number;
    status: 'processing' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    stats: UploadStats;
    errorMessage?: string;
}

export interface UploadStats {
    booksAdded: number;
    booksUpdated: number;
    notesAdded: number;
    notesSkipped: number;
    parseErrors: number;
}

// Storage error classes
export class StorageError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class ValidationError extends StorageError {
    constructor(message: string, public validationErrors?: string[], public statusCode: number = 400) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends StorageError {
    constructor(entityType: string, identifier: string) {
        super(`${entityType} with identifier '${identifier}' not found`, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
