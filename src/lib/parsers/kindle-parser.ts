import type { Book, Note } from '../types';
import { ValidationError } from '../types';

export interface ParseResult {
    books: Book[];
    notes: Note[];
    metadata: ParseMetadata;
}

export interface ParseMetadata {
    fileName?: string;
    fileSize: number;
    totalEntries: number;
    parsedAt: Date;
    statistics: {
        highlights: number;
        notes: number;
        bookmarks: number;
        uniqueBooks: number;
        associatedNotes?: number; // T013: Count of notes associated with highlights
        standaloneNotes?: number; // T013: Count of standalone notes
    };
}

export interface ParsedEntry {
    book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;
    note: Omit<Note, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>;
}

// Regular expressions for parsing Kindle entries
const KINDLE_ENTRY_SEPARATOR = '==========';
const BOOK_TITLE_REGEX = /^(.+?)\s*\(([^)]+)\)\s*$/;
const METADATA_REGEX = /^-\s*Your\s+(Highlight|Note|Bookmark)\s+on\s+(?:page\s+(\d+)\s*\|?\s*)?(?:location\s+([\d-]+)\s*\|?\s*)?Added\s+on\s+(.+)$/i;
const DATE_PATTERNS = [
    // Standard Kindle format: "Sunday, December 15, 2024 3:45:00 PM"
    /^(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
    // Alternative format: "December 15, 2024 3:45:00 PM"
    /^(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
    // ISO format fallback
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z?$/
];

export async function parseKindleFile(content: string, fileName?: string): Promise<ParseResult> {
    if (!content || content.trim().length === 0) {
        throw new ValidationError('File content is empty');
    }

    // Split content into entries
    const entries = content
        .split(KINDLE_ENTRY_SEPARATOR)
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0 && !entry.includes('My Clippings'));

    if (entries.length === 0) {
        throw new ValidationError('No valid Kindle entries found in file');
    }

    const books = new Map<string, Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>();
    const notes: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    let highlights = 0;
    let noteCount = 0;
    let bookmarks = 0;

    for (const entryText of entries) {
        try {
            const parsed = parseKindleEntry(entryText);

            // Create unique key for book
            const bookKey = `${parsed.book.title}|${parsed.book.author}`;

            if (!books.has(bookKey)) {
                books.set(bookKey, {
                    ...parsed.book,
                    id: crypto.randomUUID() // Temporary ID for grouping
                });
            }

            const book = books.get(bookKey)!;

            // Create note with book reference and temp ID for association
            const tempId = crypto.randomUUID();
            const note = {
                ...parsed.note,
                bookId: book.id,
                tempId // Temporary ID for tracking during parsing
            };

            // Count by type
            if (parsed.note.type === 'highlight') {
                highlights++;
            } else if (parsed.note.type === 'note') {
                noteCount++;
            } else if (parsed.note.type === 'bookmark') {
                bookmarks++;
            }

            notes.push(note);
        } catch (error) {
            console.warn('Failed to parse entry:', error);
            // Continue parsing other entries
        }
    }

    // T052: Associate notes with highlights based on location proximity (not file order)
    // This handles cases where notes come before highlights in the file
    let associatedNotesCount = 0;
    let standaloneNotesCount = 0;

    // Group notes by book for efficient lookup
    const notesByBook = new Map<string, typeof notes>();
    for (const note of notes) {
        if (!notesByBook.has(note.bookId)) {
            notesByBook.set(note.bookId, []);
        }
        notesByBook.get(note.bookId)!.push(note);
    }

    // For each note, find matching highlight by location
    for (const note of notes) {
        if (note.type !== 'note') continue;

        const bookNotes = notesByBook.get(note.bookId) || [];
        const highlights = bookNotes.filter(n => n.type === 'highlight');

        // Simple logic: note associates if its location matches highlight's end location
        const matchingHighlight = highlights.find(highlight => {
            if (!note.location?.start || !highlight.location) return false;

            const noteLocation = note.location.start;
            const highlightEnd = highlight.location.end || highlight.location.start;

            // Note location matches highlight's end location
            return noteLocation === highlightEnd;
        });

        if (matchingHighlight) {
            (note as any).associatedHighlightId = (matchingHighlight as any).tempId;
            associatedNotesCount++;
        } else {
            standaloneNotesCount++;
        }
    }

    // Convert books map to array and assign final IDs
    const finalBooks: Book[] = Array.from(books.values()).map(book => {
        const now = new Date();
        return {
            ...book,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
        };
    });

    // Update note book IDs to match final book IDs
    const bookIdMap = new Map<string, string>();
    Array.from(books.values()).forEach((tempBook, index) => {
        bookIdMap.set(tempBook.id, finalBooks[index].id);
    });

    // T014: Map temp IDs to final IDs for association preservation
    const noteIdMap = new Map<string, string>();
    const finalNotes: Note[] = notes.map(note => {
        const finalId = crypto.randomUUID();
        noteIdMap.set((note as any).tempId, finalId);

        const now = new Date();
        return {
            ...note,
            id: finalId,
            bookId: bookIdMap.get(note.bookId) || note.bookId,
            createdAt: now,
            updatedAt: now
        };
    });

    // T014: Update associatedHighlightId references to use final IDs
    finalNotes.forEach(note => {
        if ((note as any).associatedHighlightId) {
            const tempHighlightId = (note as any).associatedHighlightId;
            const finalHighlightId = noteIdMap.get(tempHighlightId);
            if (finalHighlightId) {
                note.associatedHighlightId = finalHighlightId;
            }
        }
        // Remove tempId property
        delete (note as any).tempId;
    });

    const metadata: ParseMetadata = {
        fileName,
        fileSize: content.length,
        totalEntries: entries.length,
        parsedAt: new Date(),
        statistics: {
            highlights,
            notes: noteCount,
            bookmarks,
            uniqueBooks: finalBooks.length,
            associatedNotes: associatedNotesCount, // T013
            standaloneNotes: standaloneNotesCount // T013
        }
    };

    return {
        books: finalBooks,
        notes: finalNotes,
        metadata
    };
}

export function parseKindleEntry(entryText: string): ParsedEntry {
    const lines = entryText.split('\n').map(line => line.trim());

    if (lines.length < 2) {
        throw new ValidationError('Invalid Kindle entry format: insufficient lines');
    }

    // Parse book title and author from first line
    const titleLine = lines[0];
    const bookMatch = titleLine.match(BOOK_TITLE_REGEX);

    let title: string;
    let author: string;

    if (bookMatch) {
        title = bookMatch[1].replace(/^Book Title:\s*/i, '').trim();
        author = bookMatch[2].trim();
    } else {
        // Fallback: treat entire line as title
        title = titleLine.replace(/^Book Title:\s*/i, '').trim();
        author = 'Unknown Author';
    }

    // Parse metadata from second line
    const metadataLine = lines[1];
    const metadataMatch = metadataLine.match(METADATA_REGEX);

    if (!metadataMatch) {
        throw new ValidationError('Invalid Kindle entry format: cannot parse metadata');
    }

    const [, typeStr, pageStr, locationStr, dateStr] = metadataMatch;

    const type = typeStr.toLowerCase() as NoteType;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;

    // Parse location with start and optional end
    let location: { start: number; end?: number } | undefined;
    if (locationStr) {
        const locationMatch = locationStr.match(/^(\d+)(?:-(\d+))?$/);
        if (locationMatch) {
            location = {
                start: parseInt(locationMatch[1], 10),
                end: locationMatch[2] ? parseInt(locationMatch[2], 10) : undefined
            };
        } else {
            // Try to parse single location
            const singleLoc = parseInt(locationStr, 10);
            if (!isNaN(singleLoc)) {
                location = { start: singleLoc };
            } else {
                console.warn(`Could not parse location: ${locationStr} for note in ${title}`);
            }
        }
    }

    // CRITICAL: Log warning if location is missing
    if (!location) {
        console.warn(`Note without location in "${title}" - deduplication will use content hash`);
    }

    const createdAt = parseKindleDate(dateStr);

    // Extract content (everything after the metadata line)
    const contentLines = lines.slice(2);
    const content = contentLines.join('\n').trim();

    const book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'> = {
        title,
        author,
        // Additional book properties will be filled with defaults
    };

    const note: Omit<Note, 'id' | 'bookId' | 'createdAt' | 'updatedAt'> = {
        type,
        content,
        page,
        location, // Now includes {start, end?} structure
        createdAt
    };

    return { book, note };
}

export function parseKindleDate(dateStr: string): Date {
    for (const pattern of DATE_PATTERNS) {
        const match = dateStr.match(pattern);
        if (match) {
            try {
                if (match.length >= 8 && match[8]) {
                    // Standard format: "Sunday, December 15, 2024 3:45:00 PM"
                    const [, dayName, monthName, day, year, hour, minute, second, ampm] = match;
                    const monthIndex = getMonthIndex(monthName);
                    const hour24 = convertTo24Hour(parseInt(hour), ampm);

                    return new Date(
                        parseInt(year),
                        monthIndex,
                        parseInt(day),
                        hour24,
                        parseInt(minute),
                        parseInt(second)
                    );
                } else if (match.length >= 7) {
                    // Alternative format: "December 15, 2024 3:45:00 PM"
                    const [, monthName, day, year, hour, minute, second, ampm] = match;
                    const monthIndex = getMonthIndex(monthName);
                    const hour24 = convertTo24Hour(parseInt(hour), ampm);

                    return new Date(
                        parseInt(year),
                        monthIndex,
                        parseInt(day),
                        hour24,
                        parseInt(minute),
                        parseInt(second)
                    );
                } else if (match.length >= 6) {
                    // ISO format: "2024-12-15T15:45:30"
                    const [, year, month, day, hour, minute, second] = match;
                    return new Date(
                        parseInt(year),
                        parseInt(month) - 1, // Month is 0-indexed
                        parseInt(day),
                        parseInt(hour),
                        parseInt(minute),
                        parseInt(second)
                    );
                }
            } catch (error) {
                console.warn('Failed to parse date with matched pattern:', error);
                continue;
            }
        }
    }

    // Fallback: try JavaScript's built-in Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
    }

    console.warn('Could not parse date:', dateStr);
    return new Date(); // Return current date as fallback
}

function getMonthIndex(monthName: string): number {
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const index = months.indexOf(monthName.toLowerCase());
    return index >= 0 ? index : 0;
}

function convertTo24Hour(hour: number, ampm: string): number {
    const isPM = ampm.toLowerCase() === 'pm';
    if (hour === 12) {
        return isPM ? 12 : 0;
    }
    return isPM ? hour + 12 : hour;
}

export function extractMetadata(content: string): ParseMetadata {
    const entries = content
        .split(KINDLE_ENTRY_SEPARATOR)
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0 && !entry.includes('My Clippings'));

    let highlights = 0;
    let notes = 0;
    let bookmarks = 0;
    const uniqueBooks = new Set<string>();

    for (const entryText of entries) {
        try {
            const lines = entryText.split('\n').map(line => line.trim());
            if (lines.length >= 2) {
                // Extract book info
                const titleLine = lines[0];
                const bookMatch = titleLine.match(BOOK_TITLE_REGEX);
                if (bookMatch) {
                    const title = bookMatch[1].replace(/^Book Title:\s*/i, '').trim();
                    const author = bookMatch[2].trim();
                    uniqueBooks.add(`${title}|${author}`);
                }

                // Extract note type
                const metadataLine = lines[1];
                const metadataMatch = metadataLine.match(METADATA_REGEX);
                if (metadataMatch) {
                    const type = metadataMatch[1].toLowerCase();
                    switch (type) {
                        case 'highlight':
                            highlights++;
                            break;
                        case 'note':
                            notes++;
                            break;
                        case 'bookmark':
                            bookmarks++;
                            break;
                    }
                }
            }
        } catch (error) {
            // Skip invalid entries
        }
    }

    return {
        fileSize: content.length,
        totalEntries: entries.length,
        parsedAt: new Date(),
        statistics: {
            highlights,
            notes,
            bookmarks,
            uniqueBooks: uniqueBooks.size
        }
    };
}

export function validateKindleFile(content: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || content.trim().length === 0) {
        errors.push('File is empty');
        return { isValid: false, errors, warnings };
    }

    if (!content.includes('==========')) {
        errors.push('File does not appear to be a Kindle clippings file (missing entry separators)');
        return { isValid: false, errors, warnings };
    }

    // Check for common Kindle patterns
    const hasBookTitle = /Book Title:/i.test(content);
    const hasHighlight = /Your Highlight/i.test(content);
    const hasNote = /Your Note/i.test(content);
    const hasBookmark = /Your Bookmark/i.test(content);

    if (!hasBookTitle) {
        warnings.push('No book titles found - file may be malformed');
    }

    if (!hasHighlight && !hasNote && !hasBookmark) {
        warnings.push('No highlights, notes, or bookmarks found');
    }

    // Count entries
    const entries = content.split('==========').filter(entry =>
        entry.trim().length > 0 && !entry.includes('My Clippings')
    );

    if (entries.length === 0) {
        errors.push('No valid entries found in file');
    } else if (entries.length < 5) {
        warnings.push(`Only ${entries.length} entries found - file may be incomplete`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}