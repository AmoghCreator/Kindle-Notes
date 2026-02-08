// MiniSearch configuration for fast client-side search
import MiniSearch from 'minisearch';
import type { Note, Book } from '@/lib/types';

export class SearchIndexManager {
    private noteIndex: MiniSearch<Note>;
    private bookIndex: MiniSearch<Book>;

    constructor() {
        // Configure note search index
        this.noteIndex = new MiniSearch({
            fields: ['text', 'userNote', 'tags'], // Fields to index for full-text search
            storeFields: ['id', 'bookId', 'type', 'location'], // Fields to return with results
            searchOptions: {
                boost: { text: 2, userNote: 1.5, tags: 3 }, // Boost important fields
                fuzzy: 0.2, // Allow for typos
                prefix: true, // Enable prefix matching
            }
        });

        // Configure book search index
        this.bookIndex = new MiniSearch({
            fields: ['title', 'author', 'tags'],
            storeFields: ['id', 'noteCount'],
            searchOptions: {
                boost: { title: 3, author: 2, tags: 1.5 },
                fuzzy: 0.2,
                prefix: true,
            }
        });
    }

    // Add notes to search index
    addNotes(notes: Note[]): void {
        try {
            this.noteIndex.addAll(notes.map(note => ({
                ...note,
                // Flatten tags array for better searching
                tags: note.tags.join(' '),
                // Combine location info for searchable text
                locationText: this.formatLocationForSearch(note.location)
            })));
        } catch (error) {
            console.error('Failed to add notes to search index:', error);
        }
    }

    // Add note to search index
    addNote(note: Note): void {
        try {
            this.noteIndex.add({
                ...note,
                tags: note.tags.join(' '),
                locationText: this.formatLocationForSearch(note.location)
            });
        } catch (error) {
            console.error('Failed to add note to search index:', error);
        }
    }

    // Update note in search index
    updateNote(note: Note): void {
        try {
            this.noteIndex.replace({
                ...note,
                tags: note.tags.join(' '),
                locationText: this.formatLocationForSearch(note.location)
            });
        } catch (error) {
            console.error('Failed to update note in search index:', error);
        }
    }

    // Remove note from search index
    removeNote(noteId: string): void {
        try {
            this.noteIndex.discard(noteId);
        } catch (error) {
            console.error('Failed to remove note from search index:', error);
        }
    }

    // Add books to search index
    addBooks(books: Book[]): void {
        try {
            this.bookIndex.addAll(books.map(book => ({
                ...book,
                tags: book.tags.join(' ')
            })));
        } catch (error) {
            console.error('Failed to add books to search index:', error);
        }
    }

    // Add book to search index
    addBook(book: Book): void {
        try {
            this.bookIndex.add({
                ...book,
                tags: book.tags.join(' ')
            });
        } catch (error) {
            console.error('Failed to add book to search index:', error);
        }
    }

    // Search notes with enhanced options
    searchNotes(
        query: string,
        options: {
            bookIds?: string[];
            type?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): {
        results: Array<{ note: Partial<Note>; score: number; match: Record<string, string[]> }>;
        totalCount: number;
        suggestions: string[];
    } {
        if (!query.trim()) {
            return { results: [], totalCount: 0, suggestions: [] };
        }

        try {
            const searchResults = this.noteIndex.search(query, {
                combineWith: 'AND',
                ...this.noteIndex.searchOptions
            });

            // Filter by book IDs if specified
            let filteredResults = searchResults;
            if (options.bookIds && options.bookIds.length > 0) {
                filteredResults = searchResults.filter(result =>
                    options.bookIds!.includes(result.bookId)
                );
            }

            // Filter by type if specified
            if (options.type) {
                filteredResults = filteredResults.filter(result =>
                    result.type === options.type
                );
            }

            // Apply pagination
            const totalCount = filteredResults.length;
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            const paginatedResults = filteredResults.slice(offset, offset + limit);

            // Generate search suggestions
            const suggestions = this.generateSuggestions(query);

            return {
                results: paginatedResults.map(result => ({
                    note: result as Partial<Note>,
                    score: result.score,
                    match: result.match || {}
                })),
                totalCount,
                suggestions
            };
        } catch (error) {
            console.error('Search failed:', error);
            return { results: [], totalCount: 0, suggestions: [] };
        }
    }

    // Search books
    searchBooks(query: string, limit: number = 20): Array<{ book: Partial<Book>; score: number }> {
        if (!query.trim()) {
            return [];
        }

        try {
            const results = this.bookIndex.search(query, {
                combineWith: 'AND'
            }).slice(0, limit);

            return results.map(result => ({
                book: result as Partial<Book>,
                score: result.score
            }));
        } catch (error) {
            console.error('Book search failed:', error);
            return [];
        }
    }

    // Get search suggestions based on indexed terms
    private generateSuggestions(query: string): string[] {
        try {
            const autoSuggest = this.noteIndex.autoSuggest(query, {
                fuzzy: 0.2,
                prefix: true
            });

            return autoSuggest
                .slice(0, 5) // Limit to 5 suggestions
                .map(suggestion => suggestion.suggestion);
        } catch (error) {
            console.error('Failed to generate suggestions:', error);
            return [];
        }
    }

    // Helper to format location data for search
    private formatLocationForSearch(location?: { page?: number; location?: number; chapter?: string; position?: string }): string {
        if (!location) return '';

        const parts = [];
        if (location.page) parts.push(`page ${location.page}`);
        if (location.chapter) parts.push(location.chapter);
        if (location.position) parts.push(location.position);

        return parts.join(' ');
    }

    // Clear all indices
    clearIndices(): void {
        this.noteIndex.removeAll();
        this.bookIndex.removeAll();
    }

    // Get search statistics
    getStats() {
        return {
            notesIndexed: this.noteIndex.documentCount,
            booksIndexed: this.bookIndex.documentCount,
            noteTermCount: this.noteIndex.termCount,
            bookTermCount: this.bookIndex.termCount
        };
    }
}

// Singleton search manager instance
export const searchManager = new SearchIndexManager();