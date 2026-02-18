export * from '../../utils/errors';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    estimatedEntries?: number;
    estimatedProcessingTime?: number;
}

export interface FileFormatInfo {
    formatType: 'kindle' | 'unknown';
    confidence: number;
    detectedBooks: number;
    detectedEntries: number;
    hasProperSeparators: boolean;
}

/**
 * Validate a text file for Kindle notes format
 */
export function validateKindleTextFile(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic checks
    if (!content || content.trim().length === 0) {
        errors.push('File content is empty');
        return { isValid: false, errors, warnings };
    }

    // Check for basic Kindle format indicators
    const hasBookTitles = /^.+\s*\(.+\)\s*$/m.test(content);
    const hasMetadata = /^-\s*Your\s+(Highlight|Note|Bookmark)\s+on\s+/im.test(content);
    const hasSeparators = content.includes('==========');

    if (!hasBookTitles && !hasMetadata) {
        errors.push('File does not appear to be a Kindle notes export (no book titles or note metadata found)');
    }

    if (!hasSeparators) {
        warnings.push('File is missing entry separators (==========), parsing may be unreliable');
    }

    // Estimate content
    const separatorCount = (content.match(/==========/g) || []).length;
    const estimatedEntries = Math.max(separatorCount, 1);

    // Rough processing time estimate (1-2ms per entry + overhead)
    const estimatedProcessingTime = Math.max(100, estimatedEntries * 2);

    // File size checks
    const sizeInMB = new Blob([content]).size / (1024 * 1024);
    if (sizeInMB > 10) {
        warnings.push(`Large file detected (${sizeInMB.toFixed(1)}MB). Processing may take longer.`);
    }

    if (estimatedEntries > 10000) {
        warnings.push(`Large number of entries detected (${estimatedEntries}). Consider splitting the file.`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedEntries,
        estimatedProcessingTime
    };
}

/**
 * Validate a file before processing
 */
export function validateFile(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!file.name.toLowerCase().endsWith('.txt')) {
        errors.push('File must be a .txt file');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size (10MB)`);
    }

    if (file.size === 0) {
        errors.push('File is empty');
    }

    // Performance warnings
    if (file.size > 5 * 1024 * 1024) { // 5MB
        warnings.push('Large file detected. Processing may take 30+ seconds.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Analyze file format for confidence scoring
 */
export function analyzeFileFormat(content: string): FileFormatInfo {
    const bookTitleMatches = content.match(/^.+\s*\(.+\)\s*$/gm) || [];
    const metadataMatches = content.match(/^-\s*Your\s+(Highlight|Note|Bookmark)\s+on\s+/gim) || [];
    const separatorMatches = content.match(/==========/g) || [];

    const detectedBooks = bookTitleMatches.length;
    const detectedEntries = Math.max(metadataMatches.length, separatorMatches.length);
    const hasProperSeparators = separatorMatches.length > 0;

    // Calculate confidence based on format indicators
    let confidence = 0;

    if (detectedBooks > 0) confidence += 0.3;
    if (metadataMatches.length > 0) confidence += 0.4;
    if (hasProperSeparators) confidence += 0.3;

    // Bonus for having multiple indicators
    if (detectedBooks > 0 && metadataMatches.length > 0 && hasProperSeparators) {
        confidence = Math.min(1.0, confidence + 0.1);
    }

    const formatType: 'kindle' | 'unknown' = confidence >= 0.7 ? 'kindle' : 'unknown';

    return {
        formatType,
        confidence,
        detectedBooks,
        detectedEntries,
        hasProperSeparators
    };
}

/**
 * Sanitize and normalize text content
 */
export function sanitizeTextContent(content: string): string {
    return content
        .trim()
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n')   // Handle old Mac line endings
        .replace(/\n{3,}/g, '\n\n'); // Reduce excessive newlines
}

/**
 * Validate a book object
 */
export function validateBook(book: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!book.title || typeof book.title !== 'string' || book.title.trim().length === 0) {
        errors.push('Book title is required and must be a non-empty string');
    }

    if (!book.author || typeof book.author !== 'string' || book.author.trim().length === 0) {
        errors.push('Book author is required and must be a non-empty string');
    }

    // Check optional fields
    if (book.tags && !Array.isArray(book.tags)) {
        errors.push('Book tags must be an array');
    }

    if (book.tags && Array.isArray(book.tags)) {
        for (const tag of book.tags) {
            if (typeof tag !== 'string') {
                errors.push('All book tags must be strings');
                break;
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate a note object
 */
export function validateNote(note: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!note.content || typeof note.content !== 'string') {
        errors.push('Note content is required and must be a string');
    }

    if (!note.type || !['highlight', 'note', 'bookmark'].includes(note.type)) {
        errors.push('Note type must be one of: highlight, note, bookmark');
    }

    if (!note.bookId || typeof note.bookId !== 'string') {
        errors.push('Note bookId is required and must be a string');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate an upload object  
 */
export function validateUpload(upload: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!upload.fileName || typeof upload.fileName !== 'string') {
        errors.push('Upload fileName is required and must be a string');
    }

    if (!upload.status || !['pending', 'processing', 'completed', 'failed'].includes(upload.status)) {
        errors.push('Upload status must be one of: pending, processing, completed, failed');
    }

    if (typeof upload.fileSize !== 'number' || upload.fileSize < 0) {
        errors.push('Upload fileSize must be a non-negative number');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate parsed entry data
 */
export function validateParsedEntry(entry: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!entry.bookIdentifier || entry.bookIdentifier.trim().length === 0) {
        errors.push('Missing book identifier');
    }

    if (!entry.entryType || !['highlight', 'note', 'bookmark'].includes(entry.entryType)) {
        errors.push(`Invalid entry type: ${entry.entryType}`);
    }

    if (!entry.content && entry.entryType !== 'bookmark') {
        warnings.push(`Empty content for ${entry.entryType}`);
    }

    if (!entry.timestamp || !(entry.timestamp instanceof Date) || isNaN(entry.timestamp.getTime())) {
        errors.push('Invalid or missing timestamp');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

export interface ReadingSessionFormInput {
    sessionDate: string;
    canonicalBookId: string;
    bookTitle: string;
    pageStart: number;
    pageEnd: number;
    insight?: string;
}

export function validateReadingSessionForm(input: ReadingSessionFormInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Date validation
    if (!input.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
        errors.push('Session date is required (YYYY-MM-DD)');
    } else {
        const sessionDate = new Date(input.sessionDate + 'T00:00:00');
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (sessionDate > today) {
            errors.push('Session date cannot be in the future');
        }
    }

    // Book validation
    if (!input.canonicalBookId || input.canonicalBookId.trim().length === 0) {
        errors.push('A book must be selected');
    }

    if (!input.bookTitle || input.bookTitle.trim().length === 0) {
        errors.push('Book title is required');
    }

    // Page validation
    if (typeof input.pageStart !== 'number' || input.pageStart < 1) {
        errors.push('Starting page must be at least 1');
    }

    if (typeof input.pageEnd !== 'number' || input.pageEnd < 1) {
        errors.push('Ending page must be at least 1');
    }

    if (input.pageStart && input.pageEnd && input.pageEnd < input.pageStart) {
        errors.push('Ending page must be greater than or equal to starting page');
    }

    // Insight validation
    if (input.insight && input.insight.length > 2000) {
        errors.push('Insight must be 2000 characters or fewer');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

export interface ReadingSessionInput {
    title?: string;
    author?: string;
    durationMinutes?: number;
    sessionDate?: string;
    startedAt?: Date;
    endedAt?: Date;
    pagesRead?: number;
}

export function validateReadingSessionInput(input: ReadingSessionInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.title || input.title.trim().length === 0) {
        errors.push('Book title is required');
    }

    if (typeof input.durationMinutes !== 'number' || input.durationMinutes <= 0) {
        errors.push('Duration must be a positive number of minutes');
    } else if (input.durationMinutes > 24 * 60) {
        warnings.push('Duration is unusually long; please confirm this value');
    }

    if (!input.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
        errors.push('Session date must use YYYY-MM-DD format');
    }

    if (input.startedAt && Number.isNaN(input.startedAt.getTime())) {
        errors.push('Start time is invalid');
    }

    if (input.endedAt && Number.isNaN(input.endedAt.getTime())) {
        errors.push('End time is invalid');
    }

    if (input.startedAt && input.endedAt && input.endedAt < input.startedAt) {
        errors.push('End time cannot be earlier than start time');
    }

    if (typeof input.pagesRead === 'number' && input.pagesRead < 0) {
        errors.push('Pages read cannot be negative');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

export function validateCanonicalInput(title?: string, author?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title || title.trim().length < 2) {
        errors.push('A valid book title is required for canonical matching');
    }

    if (!author || author.trim().length === 0) {
        warnings.push('Author is missing; match confidence may be reduced');
    }

    if (title && title.length > 300) {
        warnings.push('Title is unusually long and may reduce match quality');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}