import type { ImportSession, ImportStatistics } from '../types';
import { KindleNotesDatabase } from './database';

export interface SessionFilters {
    status?: import('../types').ImportStatus[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    fileName?: string;
    limit?: number;
}

export interface RollbackResult {
    sessionId: string;
    booksRemoved: number;
    notesRemoved: number;
    success: boolean;
    errors: string[];
}

export class ImportSessionService {
    private db: KindleNotesDatabase;

    constructor(db: KindleNotesDatabase) {
        this.db = db;
    }

    /**
     * Create a new import session
     */
    async createSession(fileName: string, fileSize: number): Promise<string> {
        const session: Omit<ImportSession, 'id'> = {
            fileName,
            fileSize,
            startedAt: new Date(),
            completedAt: null,
            status: 'starting',
            statistics: {
                totalEntries: 0,
                booksAdded: 0,
                booksUpdated: 0,
                notesAdded: 0,
                notesUpdated: 0,
                duplicatesSkipped: 0,
                entriesFailed: 0
            }
        };

        return await this.db.importSessions.add(session as ImportSession);
    }

    /**
     * Update an existing session
     */
    async updateSession(
        sessionId: string,
        updates: Partial<ImportSession>
    ): Promise<void> {
        const updateData: Partial<ImportSession> = {
            ...updates
        };

        // If completing, ensure completedAt is set
        if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
            updateData.completedAt = updates.completedAt || new Date();
        }

        await this.db.importSessions.update(sessionId, updateData);
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string): Promise<ImportSession | null> {
        const session = await this.db.importSessions.get(sessionId);
        return session || null;
    }

    /**
     * List sessions with optional filtering
     */
    async listSessions(filters: SessionFilters = {}): Promise<ImportSession[]> {
        let query = this.db.importSessions.orderBy('startedAt').reverse();

        // Apply filters
        if (filters.status && filters.status.length > 0) {
            query = query.filter(session => filters.status!.includes(session.status));
        }

        if (filters.dateRange) {
            query = query.filter(session =>
                session.startedAt >= filters.dateRange!.start &&
                session.startedAt <= filters.dateRange!.end
            );
        }

        if (filters.fileName) {
            query = query.filter(session =>
                session.fileName.toLowerCase().includes(filters.fileName!.toLowerCase())
            );
        }

        const results = await query.toArray();

        if (filters.limit && filters.limit > 0) {
            return results.slice(0, filters.limit);
        }

        return results;
    }

    /**
     * Rollback changes from an import session
     */
    async rollbackSession(sessionId: string): Promise<RollbackResult> {
        const result: RollbackResult = {
            sessionId,
            booksRemoved: 0,
            notesRemoved: 0,
            success: false,
            errors: []
        };

        try {
            await this.db.transaction('rw', this.db.books, this.db.notes, this.db.importSessions, async () => {
                // Find all notes imported in this session
                const notesToRemove = await this.db.notes
                    .filter(note => (note as any).importedFrom === sessionId)
                    .toArray();

                if (notesToRemove.length > 0) {
                    // Get unique book IDs before removing notes
                    const affectedBookIds = [...new Set(notesToRemove.map(note => note.bookId))];

                    // Remove notes
                    await this.db.notes
                        .filter(note => (note as any).importedFrom === sessionId)
                        .delete();

                    result.notesRemoved = notesToRemove.length;

                    // Update note counts for affected books
                    for (const bookId of affectedBookIds) {
                        const remainingNotes = await this.db.notes.where('bookId').equals(bookId).count();

                        if (remainingNotes === 0) {
                            // Remove book if no notes remain and it was imported in this session
                            const book = await this.db.books.get(bookId);
                            if (book && (book as any).importedFrom === sessionId) {
                                await this.db.books.delete(bookId);
                                result.booksRemoved++;
                            }
                        } else {
                            // Update note count
                            await this.db.books.update(bookId, { noteCount: remainingNotes });
                        }
                    }
                }

                // Update session status
                await this.updateSession(sessionId, {
                    status: 'cancelled',
                    completedAt: new Date()
                });

                result.success = true;
            });
        } catch (error) {
            result.errors.push(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }
}