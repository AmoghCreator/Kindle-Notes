// Core data types for Kindle Notes Website
// Based on data-model.md specifications



























































































































































}    }        this.warnings = []; this.errors = [];    public resetState(): void {}        return [...this.warnings];    public getWarnings(): string[] { } return [...this.errors];    public getErrors(): string[] { } this.warnings.push(message);    protected addWarning(message: string): void {}        }            throw new ValidationError(`Too many parsing errors (${this.options.maxErrors}): ${this.errors.join(', ')}`); if (this.errors.length >= this.options.maxErrors) { this.errors.push(message);    protected addError(message: string): void {}        return content.trim(); } throw new ValidationError('Entry content is empty'); if (!content || content.trim().length === 0) {    protected validateContent(content: string): string { } return null; }            }                }; timestamp: new Date() // Use current date as fallback                    location: null,                    page: null,                    type: match[1].toLowerCase() as 'highlight' | 'note' | 'bookmark',                return {                this.warnings.push(`Recovered partial metadata from: ${metadataLine}`);            if (match) {            match = metadataLine.match(KINDLE_PATTERNS.LOOSE_METADATA);        if (!this.options.strictMode) {        // Try loose pattern if not in strict mode        }            };                timestamp: this.parseKindleDate(match[4])                location: match[3] || null,                page: match[2] ? parseInt(match[2], 10) : null,                type: match[1].toLowerCase() as 'highlight' | 'note' | 'bookmark',            return {        if (match) {        let match = metadataLine.match(KINDLE_PATTERNS.METADATA);        // Try strict pattern first    } | null {        timestamp: Date;        location: string | null;        page: number | null;        type: 'highlight' | 'note' | 'bookmark';    protected extractMetadata(metadataLine: string): {    }        return null;        }            }                };                    author: match[2]?.trim() || 'Unknown Author'                    title: match[1].trim(),                return {            if (match) {            match = titleLine.match(KINDLE_PATTERNS.LOOSE_TITLE);        if (!this.options.strictMode) {        // Try loose pattern if not in strict mode        }            };                author: match[2].trim()                title: match[1].trim(),            return {        if (match) {        let match = titleLine.match(KINDLE_PATTERNS.BOOK_TITLE);        // Try strict pattern first    protected extractBookInfo(titleLine: string): { title: string; author: string } | null {    }        return new Date();        this.warnings.push(`Could not parse date: ${dateString}, using current date`);        // Fallback to current date if parsing fails                }            }                }                    continue;                } catch {                    return new Date(dateString);                try {            if (match) {            const match = dateString.match(pattern);        for (const pattern of DATE_PATTERNS) {        // Try each date pattern    protected parseKindleDate(dateString: string): Date {    }        };            ...options            recoverPartialEntries: true,            maxErrors: 10,            strictMode: false,        this.options = {    constructor(options: Partial<ParseOptions> = {}) {    private warnings: string[] = [];    private errors: string[] = [];    private options: ParseOptions;export class BaseTextParser {];    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z?$/    // ISO format fallback    /^(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,    // Alternative format: "December 15, 2024 3:45:00 PM"    /^(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,    // Standard Kindle format: "Sunday, December 15, 2024 3:45:00 PM"const DATE_PATTERNS = [} as const;    LOOSE_METADATA: /^-.*?(Highlight|Note|Bookmark).*?(\d{4}).*$/i    LOOSE_TITLE: /^([^(]+?)(?:\s*\(([^)]+)\))?\s*$/,    // Fallback patterns for malformed entries    SEPARATOR: '==========',    METADATA: /^-\s*Your\s+(Highlight|Note|Bookmark)\s+on\s+(?:page\s+(\d+)\s*\|?\s*)?(?:location\s+([\d-]+)\s*\|?\s*)?Added\s+on\s+(.+)$/i,    BOOK_TITLE: /^(.+?)\s*\(([^)]+)\)\s*$/,const KINDLE_PATTERNS = {// Enhanced regex patterns for Kindle text parsing}    onProgress?: (progress: number) => void;    recoverPartialEntries: boolean;    maxErrors: number;    strictMode: boolean;export interface ParseOptions {}    warnings: string[];    errors: string[];    statistics: ImportStatistics;    entries: ParsedTextEntry[];export interface TextParseResult {
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
    createdAt: Date;
    lastModifiedAt: Date;
    importSource: UploadMeta;
    shareHistory: ShareRecord[];
}

export interface NoteLocation {
    page?: number;
    location?: number;
    chapter?: string;
    position?: string;
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

// Text File Import Types
export interface ImportSession {
    id: string;
    fileName: string;
    fileSize: number;
    startedAt: Date;
    completedAt: Date | null;
    status: ImportStatus;
    statistics: ImportStatistics;
}

export type ImportStatus =
    | 'starting'
    | 'parsing'
    | 'deduplicating'
    | 'storing'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface ImportStatistics {
    totalEntries: number;
    booksAdded: number;
    booksUpdated: number;
    notesAdded: number;
    notesUpdated: number;
    duplicatesSkipped: number;
    entriesFailed: number;
}

export interface ParsedTextEntry {
    id: string;
    sessionId: string;
    bookIdentifier: string;
    entryType: 'highlight' | 'note' | 'bookmark';
    content: string;
    location: string | null;
    timestamp: Date;
    parseIndex: number;
}

export interface DeduplicationResult {
    parsedEntryId: string;
    decision: DeduplicationDecision;
    existingNoteId: string | null;
    similarity: number;
    conflictReason: string | null;
}

export type DeduplicationDecision =
    | 'exact_match'
    | 'content_update'
    | 'unique'
    | 'manual_review';

export interface ProcessingStatistics {
    parseTimeMs: number;
    deduplicationTimeMs: number;
    storageTimeMs: number;
    totalTimeMs: number;
    memoryPeakMb: number;
    entriesPerSecond: number;
}