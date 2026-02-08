import type { ParsedTextEntry, ImportStatistics } from '../types';

export interface ParseOptions {
    strictMode?: boolean;
    deduplicateWithin?: 'none' | 'file' | 'session' | 'global';
    maxErrors?: number;
    encoding?: string;
}

export interface TextParseResult {
    entries: ParsedTextEntry[];
    statistics: ImportStatistics;
    errors: string[];
    warnings: string[];
}

export abstract class BaseTextParser {
    protected options: ParseOptions;

    constructor(options: Partial<ParseOptions> = {}) {
        this.options = {
            strictMode: false,
            deduplicateWithin: 'session',
            maxErrors: 100,
            encoding: 'utf-8',
            ...options
        };
    }

    /**
     * Parse text content into structured entries
     */
    abstract parseText(content: string, context?: any): Promise<TextParseResult>;

    /**
     * Split content into individual entries
     * Override this method to implement format-specific splitting
     */
    protected splitIntoEntries(content: string): string[] {
        // Default implementation - split on common separators
        return content
            .split('==========')
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0);
    }

    /**
     * Extract book information from text
     */
    protected extractBookInfo(text: string): { title: string; author: string } | null {
        const patterns = [
            /^(.+?)\s*\(([^)]+)\)$/, // "Title (Author)"
            /^(.+?)\s*-\s*(.+)$/, // "Title - Author"
            /^(.+?)\s*by\s+(.+)$/i, // "Title by Author"
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
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
     * Extract metadata from text
     */
    protected extractMetadata(text: string): {
        type: 'highlight' | 'note' | 'bookmark',
        location: string,
        timestamp: Date
    } | null {
        // Common patterns for metadata extraction
        const patterns = [
            /^-\s*Your\s+(Highlight|Note|Bookmark)\s+(?:on\s+(?:page\s+\d+\s*\|?\s*)?(?:location\s+)?([^|]+?))?\s*\|\s*Added\s+on\s+(.+?)$/i,
            /^-\s*Your\s+(Highlight|Note|Bookmark)\s+at\s+location\s+([^|]+)\s*\|\s*Added\s+on\s+(.+?)$/i,
            /^-\s*(Highlight|Note|Bookmark)\s+on\s+(?:page\s+\d+\s*\|?\s*)?(?:location\s+)?([^|]+?)\s*\|\s*(.+?)$/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
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
     * Validate parsed entry
     */
    protected validateEntry(entry: ParsedTextEntry): boolean {
        return !!(entry.bookIdentifier && entry.content && entry.entryType);
    }

    /**
     * Get default parse options
     */
    getOptions(): ParseOptions {
        return { ...this.options };
    }

    /**
     * Update parse options
     */
    setOptions(options: Partial<ParseOptions>): void {
        this.options = { ...this.options, ...options };
    }
}