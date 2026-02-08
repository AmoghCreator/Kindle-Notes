import type { ParsedTextEntry, ImportSession, ProcessingStatistics, ImportStatistics } from '../types';
import { BaseTextParser, type TextParseResult, type ParseOptions } from './text-parser';
import { validateKindleTextFile, validateFile, sanitizeTextContent } from '../utils/validation';
import { ValidationError } from '../../utils/errors';
import { KindleNotesDatabase } from '../storage/database';
import { ImportSessionService } from '../storage/import-session-service';

export interface StreamingParseOptions extends ParseOptions {
    chunkSize?: number;
    maxConcurrency?: number;
    onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
    sessionId: string;
    stage: ProcessingStage;
    overallProgress: number;
    stageProgress: number;
    processedEntries: number;
    totalEntries: number;
    currentStats: ProcessingStatistics;
}

export type ProcessingStage =
    | 'validating'
    | 'parsing'
    | 'deduplicating'
    | 'storing'
    | 'completed'
    | 'failed';

export class TextFileParserService extends BaseTextParser {
    private db: KindleNotesDatabase;
    private sessionService: ImportSessionService;
    private worker: Worker | null = null;

    constructor(
        db: KindleNotesDatabase,
        sessionService: ImportSessionService,
        options: Partial<StreamingParseOptions> = {}
    ) {
        super(options);
        this.db = db;
        this.sessionService = sessionService;
    }

    /**
     * Implementation of abstract parseText method
     */
    async parseText(content: string, context?: any): Promise<TextParseResult> {
        const sanitizedContent = sanitizeTextContent(content);
        const entries = this.splitIntoEntries(sanitizedContent);
        const results: ParsedTextEntry[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];

        for (let i = 0; i < entries.length; i++) {
            try {
                const entry = this.parseEntry(entries[i], context?.sessionId || 'default', i);
                if (entry) {
                    results.push(entry);
                }
            } catch (error) {
                errors.push(`Entry ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        const statistics: ImportStatistics = {
            totalEntries: results.length,
            booksAdded: 0,
            booksUpdated: 0,
            notesAdded: 0,
            notesUpdated: 0,
            duplicatesSkipped: 0,
            entriesFailed: errors.length
        };

        return {
            entries: results,
            statistics,
            errors,
            warnings
        };
    }

    /**
     * Parse a text file with streaming and progress updates
     */
    async parseTextFile(
        fileName: string,
        content: string,
        options: Partial<StreamingParseOptions> = {}
    ): Promise<{ sessionId: string; statistics: any; result?: TextParseResult }> {
        const opts: StreamingParseOptions = {
            chunkSize: 64 * 1024, // 64KB chunks
            maxConcurrency: 1,
            ...options,
            ...this.options
        };

        // Create import session
        const sessionId = await this.sessionService.createSession(fileName, content.length);

        try {
            opts.onProgress?.({
                sessionId,
                stage: 'validating',
                overallProgress: 5,
                stageProgress: 100,
                processedEntries: 0,
                totalEntries: 0,
                currentStats: this.getEmptyStats()
            });

            // Validate content
            const contentValidation = validateKindleTextFile(content);

            if (!contentValidation.isValid) {
                await this.sessionService.updateSession(sessionId, {
                    status: 'failed',
                    completedAt: new Date()
                });
                throw new ValidationError(contentValidation.errors.join('; '));
            }

            opts.onProgress?.({
                sessionId,
                stage: 'parsing',
                overallProgress: 10,
                stageProgress: 0,
                processedEntries: 0,
                totalEntries: contentValidation.estimatedEntries || 0,
                currentStats: this.getEmptyStats()
            });

            // Parse content using streaming approach
            const result = await this.parseContentStreaming(content, sessionId, opts);

            // Update session as completed
            await this.sessionService.updateSession(sessionId, {
                status: 'completed',
                completedAt: new Date(),
                statistics: result.statistics
            });

            opts.onProgress?.({
                sessionId,
                stage: 'completed',
                overallProgress: 100,
                stageProgress: 100,
                processedEntries: result.entries.length,
                totalEntries: result.entries.length,
                currentStats: this.getEmptyStats()
            });

            return {
                sessionId,
                statistics: {
                    entriesProcessed: result.entries.length,
                    booksCreated: result.statistics.booksAdded,
                    notesImported: result.statistics.notesAdded,
                    highlightsImported: result.statistics.notesAdded, // TODO: Separate highlights
                    duplicatesSkipped: result.statistics.duplicatesSkipped,
                    processingTimeMs: performance.now() - performance.now() // TODO: Implement proper timing
                },
                result
            };
        } catch (error) {
            await this.sessionService.updateSession(sessionId, {
                status: 'failed',
                completedAt: new Date()
            });
            throw error;
        }
    }

    /**
     * Parse content using streaming with Web Worker
     */
    private async parseContentStreaming(
        content: string,
        sessionId: string,
        options: StreamingParseOptions
    ): Promise<TextParseResult> {
        const sanitizedContent = sanitizeTextContent(content);
        const entries = this.splitIntoEntries(sanitizedContent);
        const results: ParsedTextEntry[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];
        const startTime = performance.now();

        // For now, let's do synchronous parsing to avoid worker path issues
        // TODO: Re-enable worker when path issues are resolved
        try {
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                console.log(`Processing entry ${i}:`, entry.substring(0, 100) + '...');

                try {
                    const parsedEntry = this.parseEntry(entry, sessionId, i);
                    if (parsedEntry) {
                        results.push(parsedEntry);
                        console.log(`Successfully parsed entry ${i} as ${parsedEntry.entryType}`);
                    } else {
                        console.log(`Entry ${i} was skipped (returned null)`);
                    }
                } catch (error) {
                    const errorMsg = `Entry ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error(errorMsg, error);
                    errors.push(errorMsg);
                }

                // Update progress every 10 entries
                if (i % 10 === 0 || i === entries.length - 1) {
                    const progress = ((i + 1) / entries.length) * 80 + 10; // 10-90%
                    options.onProgress?.({
                        sessionId,
                        stage: 'parsing',
                        overallProgress: progress,
                        stageProgress: ((i + 1) / entries.length) * 100,
                        processedEntries: results.length,
                        totalEntries: entries.length,
                        currentStats: this.getCurrentStats(startTime, results.length)
                    });
                }

                // Yield control every 50 entries to prevent UI blocking
                if (i % 50 === 0 && i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }

            // Store the parsed entries as books and notes
            options.onProgress?.({
                sessionId,
                stage: 'storing',
                overallProgress: 90,
                stageProgress: 0,
                processedEntries: results.length,
                totalEntries: results.length,
                currentStats: this.getCurrentStats(startTime, results.length)
            });

            const storageStats = await this.storeEntriesAsNotesAndBooks(results);
            
            const statistics: ImportStatistics = {
                totalEntries: results.length,
                booksAdded: storageStats.booksCreated,
                booksUpdated: storageStats.booksUpdated,
                notesAdded: storageStats.notesCreated,
                notesUpdated: storageStats.notesUpdated,
                duplicatesSkipped: storageStats.duplicatesSkipped,
                entriesFailed: errors.length
            };

            return {
                entries: results,
                statistics,
                errors,
                warnings
            };
        } catch (error) {
            throw new ValidationError(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Store parsed entries as books and notes in the database
     */
    private async storeEntriesAsNotesAndBooks(entries: ParsedTextEntry[]): Promise<{
        booksCreated: number;
        booksUpdated: number;
        notesCreated: number;
        notesUpdated: number;
        duplicatesSkipped: number;
    }> {
        const bookMap = new Map<string, any>();
        const notesList: any[] = [];
        let booksCreated = 0;
        let booksUpdated = 0;
        let notesCreated = 0;
        let duplicatesSkipped = 0;

        // Group entries by book and collect unique books
        for (const entry of entries) {
            const [title, author] = entry.bookIdentifier.split('|');
            const bookKey = entry.bookIdentifier;

            if (!bookMap.has(bookKey)) {
                bookMap.set(bookKey, {
                    title: title.trim(),
                    author: author.trim(),
                    tags: [],
                });
            }

            // Add note for this entry (except empty bookmarks)
            if (entry.entryType !== 'bookmark' || entry.content) {
                notesList.push({
                    content: entry.content,
                    type: entry.entryType,
                    location: entry.location,
                    page: this.extractPageNumber(entry.location),
                    bookTitle: title.trim(),
                    bookAuthor: author.trim(),
                    createdAt: entry.timestamp,
                    tags: []
                });
            }
        }

        // Store books first
        for (const [bookKey, bookData] of bookMap) {
            try {
                // Check if book already exists
                const existingBooks = await this.db.books
                    .where('title').equals(bookData.title)
                    .and(book => book.author === bookData.author)
                    .toArray();

                if (existingBooks.length === 0) {
                    // Create new book
                    await this.db.books.add({
                        id: crypto.randomUUID(),
                        title: bookData.title,
                        author: bookData.author,
                        description: '',
                        tags: bookData.tags,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    booksCreated++;
                } else {
                    // Book already exists
                    booksUpdated++;
                }
            } catch (error) {
                console.error('Failed to store book:', bookData, error);
            }
        }

        // Store notes
        for (const noteData of notesList) {
            try {
                // Find the book for this note
                const book = await this.db.books
                    .where('title').equals(noteData.bookTitle)
                    .and(book => book.author === noteData.bookAuthor)
                    .first();

                if (book) {
                    // Check for duplicates based on content and location
                    const existingNote = await this.db.notes
                        .where('bookId').equals(book.id)
                        .and(note => 
                            note.content === noteData.content && 
                            note.location === noteData.location
                        )
                        .first();

                    if (!existingNote) {
                        // Create new note
                        await this.db.notes.add({
                            id: crypto.randomUUID(),
                            bookId: book.id,
                            content: noteData.content,
                            type: noteData.type,
                            location: noteData.location,
                            page: noteData.page,
                            tags: noteData.tags,
                            createdAt: noteData.createdAt,
                            updatedAt: new Date()
                        });
                        notesCreated++;
                    } else {
                        duplicatesSkipped++;
                    }
                }
            } catch (error) {
                console.error('Failed to store note:', noteData, error);
            }
        }

        return {
            booksCreated,
            booksUpdated,
            notesCreated,
            notesUpdated: 0,
            duplicatesSkipped
        };
    }

    /**
     * Extract page number from location string
     */
    private extractPageNumber(location: string): number | undefined {
        const pageMatch = location.match(/page\s+(\d+)/i);
        return pageMatch ? parseInt(pageMatch[1], 10) : undefined;
    }

    /**
     * Parse a single entry synchronously
     */
    private parseEntry(entryText: string, sessionId: string, index: number): ParsedTextEntry | null {
        const entry = entryText.trim();
        if (!entry) return null;

        const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) {
            this.addWarning(`Entry ${index}: Insufficient lines (${lines.length}), skipping`);
            return null;
        }

        // Standard Kindle format:
        // Line 1: Book Title (Author)
        // Line 2: - Your Highlight/Note/Bookmark on page X | location Y | Added on Date
        // Line 3+: Content (optional for bookmarks)

        const bookInfo = this.extractBookInfo(lines[0]);
        if (!bookInfo) {
            this.addWarning(`Entry ${index}: Could not extract book info from: ${lines[0]}`);
            return null;
        }

        const metadata = this.extractMetadata(lines[1]);
        if (!metadata) {
            this.addError(`Entry ${index}: Could not parse metadata: ${lines[1]}`);
            return null;
        }

        // Content is everything from line 3 onwards (optional for bookmarks)
        const content = lines.length > 2 ? lines.slice(2).join('\n').trim() : '';

        // Bookmarks don't require content, but other types do
        if (!content && metadata.type !== 'bookmark') {
            this.addWarning(`Entry ${index}: No content found for ${metadata.type}`);
            return null;
        }

        return {
            id: `${sessionId}-${index}`,
            sessionId,
            bookIdentifier: `${bookInfo.title}|${bookInfo.author}`,
            entryType: metadata.type,
            content,
            location: metadata.location,
            timestamp: metadata.timestamp,
            parseIndex: index
        };
    }

    private async readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'utf-8');
        });
    }

    private splitIntoEntries(content: string): string[] {
        const entries = content
            .split('==========')
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0);

        console.log(`Split content into ${entries.length} entries`);
        entries.forEach((entry, index) => {
            const lines = entry.split('\n').filter(line => line.trim());
            console.log(`Entry ${index}: ${lines.length} lines - First line: "${lines[0] || 'EMPTY'}"`);
        });

        return entries;
    }

    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    private processChunkInWorker(
        chunk: string[],
        batchId: number,
        options: any
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const handleMessage = (e: MessageEvent) => {
                if (e.data.batchId === batchId) {
                    this.worker!.removeEventListener('message', handleMessage);
                    if (e.data.success) {
                        resolve(e.data.data);
                    } else {
                        reject(new Error(e.data.error));
                    }
                }
            };

            this.worker.addEventListener('message', handleMessage);
            this.worker.postMessage({
                type: 'PARSE_BATCH',
                data: {
                    entries: chunk,
                    batchId,
                    options
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                this.worker!.removeEventListener('message', handleMessage);
                reject(new Error('Worker timeout'));
            }, 30000);
        });
    }

    private getEmptyStats(): ProcessingStatistics {
        return {
            parseTimeMs: 0,
            deduplicationTimeMs: 0,
            storageTimeMs: 0,
            totalTimeMs: 0,
            memoryPeakMb: 0,
            entriesPerSecond: 0
        };
    }

    private getCurrentStats(startTime: number, processedEntries: number): ProcessingStatistics {
        const elapsed = performance.now() - startTime;
        return {
            parseTimeMs: elapsed,
            deduplicationTimeMs: 0,
            storageTimeMs: 0,
            totalTimeMs: elapsed,
            memoryPeakMb: this.estimateMemoryUsage(),
            entriesPerSecond: processedEntries / (elapsed / 1000) || 0
        };
    }

    private estimateMemoryUsage(): number {
        // Rough estimate - would need performance.measureUserAgentSpecificMemory in real app
        return (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0;
    }

    /**
     * Cancel ongoing parsing operation
     */
    async cancelParsing(sessionId: string): Promise<void> {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        await this.sessionService.updateSession(sessionId, {
            status: 'cancelled',
            completedAt: new Date()
        });
    }

    /**
     * Extract book information from a line
     */
    private extractBookInfo(line: string): { title: string; author: string } | null {
        const patterns = [
            /^(.+?)\s*\(([^)]+)\)$/, // "Title (Author)"
            /^(.+?)\s*-\s*(.+)$/, // "Title - Author"
            /^(.+?)\s*by\s+(.+)$/i, // "Title by Author"
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return {
                    title: match[1].trim(),
                    author: match[2].trim()
                };
            }
        }

        return null;
    }

    /**
     * Extract metadata from a line
     */
    private extractMetadata(line: string): { type: 'highlight' | 'note' | 'bookmark', location: string, timestamp: Date } | null {
        // Common Kindle patterns:
        // "- Your Highlight on page 45 | location 1234-1235 | Added on Monday, January 1, 2024 12:00:00 AM"
        // "- Your Note on page 45 | location 1234 | Added on Monday, January 1, 2024 12:00:00 AM"
        // "- Your Bookmark on page 45 | location 1234 | Added on Monday, January 1, 2024 12:00:00 AM"

        // Enhanced pattern to handle various Kindle formats
        const patterns = [
            /^-\s*Your\s+(Highlight|Note|Bookmark)\s+(?:on\s+(?:page\s+\d+\s*\|?\s*)?(?:location\s+)?([^|]+?))?\s*\|\s*Added\s+on\s+(.+?)$/i,
            /^-\s*Your\s+(Highlight|Note|Bookmark)\s+at\s+location\s+([^|]+)\s*\|\s*Added\s+on\s+(.+?)$/i,
            /^-\s*(Highlight|Note|Bookmark)\s+on\s+(?:page\s+\d+\s*\|?\s*)?(?:location\s+)?([^|]+?)\s*\|\s*(.+?)$/i,
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                try {
                    return {
                        type: match[1].toLowerCase() as 'highlight' | 'note' | 'bookmark',
                        location: match[2]?.trim() || 'Unknown',
                        timestamp: new Date(match[3].trim())
                    };
                } catch (error) {
                    // If date parsing fails, continue to next pattern
                    continue;
                }
            }
        }

        return null;
    }



    /**
     * Add warning to current parsing session
     */
    private addWarning(message: string): void {
        // For now, just log - could be enhanced to collect warnings
        console.warn(`TextParser: ${message}`);
    }

    /**
     * Add error to current parsing session
     */
    private addError(message: string): void {
        // For now, just log - could be enhanced to collect errors
        console.error(`TextParser: ${message}`);
    }
}