import type { Note, ParsedTextEntry, DeduplicationResult, DeduplicationDecision } from '../types';
import { KindleNotesDatabase } from './database';

export interface DeduplicationConfig {
    similarityThreshold: number;
    autoUpdateContent: boolean;
    promptForConflicts: boolean;
    exactMatchStrategy: 'skip' | 'update_timestamp' | 'prompt';
    crossSessionDeduplication: boolean;
}

export interface DeduplicationIndex {
    exactMatches: Map<string, Note>;
    locationMatches: Map<string, Note[]>;
    textHashes: Set<string>;
}

export class DeduplicationService {
    private db: KindleNotesDatabase;
    private config: DeduplicationConfig;

    constructor(db: KindleNotesDatabase, config: Partial<DeduplicationConfig> = {}) {
        this.db = db;
        this.config = {
            similarityThreshold: 0.8,
            autoUpdateContent: true,
            promptForConflicts: true,
            exactMatchStrategy: 'skip',
            crossSessionDeduplication: true,
            ...config
        };
    }

    /**
     * Build an optimized index for fast duplicate detection
     */
    async buildDeduplicationIndex(existingNotes: Note[]): Promise<DeduplicationIndex> {
        const exactMatches = new Map<string, Note>();
        const locationMatches = new Map<string, Note[]>();
        const textHashes = new Set<string>();

        for (const note of existingNotes) {
            // Create exact match key
            const exactKey = this.createExactKey(note);
            exactMatches.set(exactKey, note);

            // Create location match key
            const locationKey = this.createLocationKey(note);
            if (!locationMatches.has(locationKey)) {
                locationMatches.set(locationKey, []);
            }
            locationMatches.get(locationKey)!.push(note);

            // Add text hash
            textHashes.add(this.hashText(note.text));
        }

        return { exactMatches, locationMatches, textHashes };
    }

    /**
     * Check if a parsed entry is a duplicate of existing content
     */
    async checkDuplicate(
        entry: ParsedTextEntry,
        index: DeduplicationIndex
    ): Promise<DeduplicationResult> {
        // Create a temporary note-like object for comparison
        const tempNote: Partial<Note> = {
            bookId: entry.bookIdentifier, // Will be mapped to real book ID later
            text: entry.content,
            type: entry.entryType as 'highlight' | 'note' | 'bookmark',
            location: entry.location ? { location: parseInt(entry.location) } : undefined
        };

        // Check for exact match first (O(1) lookup)
        const exactKey = this.createExactKey(tempNote as Note);
        const exactMatch = index.exactMatches.get(exactKey);

        if (exactMatch) {
            return {
                parsedEntryId: entry.id,
                decision: 'exact_match',
                existingNoteId: exactMatch.id,
                similarity: 1.0,
                conflictReason: null
            };
        }

        // Check for location-based fuzzy matching
        const locationKey = this.createLocationKey(tempNote as Note);
        const locationCandidates = index.locationMatches.get(locationKey) || [];

        for (const candidate of locationCandidates) {
            const similarity = this.calculateTextSimilarity(entry.content, candidate.text);

            if (similarity >= this.config.similarityThreshold) {
                if (similarity === 1.0) {
                    // Text is identical but keys didn't match (shouldn't happen but handle gracefully)
                    return {
                        parsedEntryId: entry.id,
                        decision: 'exact_match',
                        existingNoteId: candidate.id,
                        similarity,
                        conflictReason: null
                    };
                } else if (this.config.autoUpdateContent && similarity >= 0.9) {
                    // High similarity - likely an updated version of the same note
                    return {
                        parsedEntryId: entry.id,
                        decision: 'content_update',
                        existingNoteId: candidate.id,
                        similarity,
                        conflictReason: null
                    };
                } else if (this.config.promptForConflicts) {
                    // Medium similarity - ask user what to do
                    return {
                        parsedEntryId: entry.id,
                        decision: 'manual_review',
                        existingNoteId: candidate.id,
                        similarity,
                        conflictReason: `Similar content found (${Math.round(similarity * 100)}% match)`
                    };
                }
            }
        }

        // No match found - this is a unique entry
        return {
            parsedEntryId: entry.id,
            decision: 'unique',
            existingNoteId: null,
            similarity: 0,
            conflictReason: null
        };
    }

    /**
     * Calculate text similarity for fuzzy matching
     */
    calculateTextSimilarity(text1: string, text2: string): number {
        // Normalize texts (remove extra spaces, punctuation, case)
        const normalize = (text: string) => text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const norm1 = normalize(text1);
        const norm2 = normalize(text2);

        // Exact match after normalization
        if (norm1 === norm2) return 1.0;

        // Simple Jaccard similarity using word sets
        const words1 = new Set(norm1.split(' '));
        const words2 = new Set(norm2.split(' '));

        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Create exact match key for O(1) duplicate detection
     */
    private createExactKey(note: Note): string {
        const location = note.location?.location || note.location?.page || 'no-location';
        const textHash = this.hashText(note.text);
        return `${note.bookId}:${location}:${note.type}:${textHash}`;
    }

    /**
     * Create location match key for fuzzy comparison
     */
    private createLocationKey(note: Note): string {
        const location = note.location?.location || note.location?.page || 'no-location';
        return `${note.bookId}:${location}:${note.type}`;
    }

    /**
     * Simple hash function for text content
     */
    private hashText(text: string): string {
        // Simple hash using built-in string methods
        // For a more robust hash, consider using crypto.subtle.digest
        let hash = 0;
        const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();

        if (normalized.length === 0) return '0';

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return Math.abs(hash).toString(36);
    }

    /**
     * Store deduplication result in database
     */
    async saveDeduplicationResult(result: DeduplicationResult): Promise<void> {
        await this.db.deduplicationResults.add(result);
    }

    /**
     * Get deduplication statistics for a session
     */
    async getSessionStatistics(sessionId: string): Promise<{
        totalChecked: number;
        exactMatches: number;
        contentUpdates: number;
        manualReviews: number;
        unique: number;
    }> {
        const results = await this.db.deduplicationResults
            .where('parsedEntryId')
            .startsWithIgnoreCase(sessionId)
            .toArray();

        const stats = {
            totalChecked: results.length,
            exactMatches: 0,
            contentUpdates: 0,
            manualReviews: 0,
            unique: 0
        };

        for (const result of results) {
            switch (result.decision) {
                case 'exact_match':
                    stats.exactMatches++;
                    break;
                case 'content_update':
                    stats.contentUpdates++;
                    break;
                case 'manual_review':
                    stats.manualReviews++;
                    break;
                case 'unique':
                    stats.unique++;
                    break;
            }
        }

        return stats;
    }
}