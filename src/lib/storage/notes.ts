import { DatabaseService } from './database';
import type { Note, NoteType } from '../types';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { validateNote } from '../../utils/validation';

export class NotesStorage {
    constructor(private db: DatabaseService) { }

    async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
        // Validate input data
        const validation = validateNote(data);
        if (!validation.isValid) {
            throw new ValidationError('Invalid note data', validation.errors);
        }

        const now = new Date();
        const note: Note = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: now,
            updatedAt: now
        };

        try {
            await this.db.notes.add(note);
            return note;
        } catch (error) {
            throw new Error(`Failed to create note: ${error}`);
        }
    }

    async findById(id: string): Promise<Note | undefined> {
        try {
            return await this.db.notes.get(id);
        } catch (error) {
            throw new Error(`Failed to find note: ${error}`);
        }
    }

    async findAll(): Promise<Note[]> {
        try {
            return await this.db.notes.orderBy('createdAt').reverse().toArray();
        } catch (error) {
            throw new Error(`Failed to fetch notes: ${error}`);
        }
    }

    async findByBookId(bookId: string): Promise<Note[]> {
        try {
            return await this.db.notes
                .where('bookId')
                .equals(bookId)
                .sortBy('page');
        } catch (error) {
            throw new Error(`Failed to find notes by book ID: ${error}`);
        }
    }

    async findByType(type: NoteType): Promise<Note[]> {
        try {
            return await this.db.notes
                .where('type')
                .equals(type)
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to find notes by type: ${error}`);
        }
    }

    async findByTags(tags: string[]): Promise<Note[]> {
        try {
            return await this.db.notes
                .filter(note =>
                    note.tags && tags.every(tag => note.tags!.includes(tag))
                )
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to find notes by tags: ${error}`);
        }
    }

    async findByDateRange(startDate: Date, endDate: Date): Promise<Note[]> {
        try {
            return await this.db.notes
                .where('createdAt')
                .between(startDate, endDate, true, true)
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to find notes by date range: ${error}`);
        }
    }

    async update(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Note> {
        const existingNote = await this.findById(id);
        if (!existingNote) {
            throw new NotFoundError('Note not found');
        }

        // Validate updated data
        const updatedData = { ...existingNote, ...updates };
        const validation = validateNote(updatedData);
        if (!validation.isValid) {
            throw new ValidationError('Invalid note update data', validation.errors);
        }

        const updatedNote: Note = {
            ...existingNote,
            ...updates,
            updatedAt: new Date()
        };

        try {
            await this.db.notes.put(updatedNote);
            return updatedNote;
        } catch (error) {
            throw new Error(`Failed to update note: ${error}`);
        }
    }

    async delete(id: string): Promise<void> {
        const note = await this.findById(id);
        if (!note) {
            throw new NotFoundError('Note not found');
        }

        try {
            await this.db.notes.delete(id);
        } catch (error) {
            throw new Error(`Failed to delete note: ${error}`);
        }
    }

    async search(query: string): Promise<Note[]> {
        try {
            const normalizedQuery = query.toLowerCase();
            return await this.db.notes
                .filter(note =>
                    note.content.toLowerCase().includes(normalizedQuery) ||
                    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)))
                )
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to search notes: ${error}`);
        }
    }

    async getRecentNotes(limit: number = 10): Promise<Note[]> {
        try {
            return await this.db.notes
                .orderBy('createdAt')
                .reverse()
                .limit(limit)
                .toArray();
        } catch (error) {
            throw new Error(`Failed to get recent notes: ${error}`);
        }
    }

    async getNotesByPage(bookId: string, page: number): Promise<Note[]> {
        try {
            return await this.db.notes
                .where(['bookId', 'page'])
                .equals([bookId, page])
                .sortBy('location');
        } catch (error) {
            throw new Error(`Failed to get notes by page: ${error}`);
        }
    }

    async getStatistics(): Promise<{
        totalNotes: number;
        notesByType: { type: NoteType; count: number }[];
        topTags: { tag: string; count: number }[];
        averageNotesPerBook: number;
    }> {
        try {
            const allNotes = await this.findAll();
            const totalNotes = allNotes.length;

            // Count notes by type
            const typeCounts = allNotes.reduce((acc, note) => {
                acc[note.type] = (acc[note.type] || 0) + 1;
                return acc;
            }, {} as Record<NoteType, number>);

            const notesByType = Object.entries(typeCounts).map(([type, count]) => ({
                type: type as NoteType,
                count
            }));

            // Count tags
            const tagCounts: Record<string, number> = {};
            allNotes.forEach(note => {
                if (note.tags) {
                    note.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });

            const topTags = Object.entries(tagCounts)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Calculate average notes per book
            const uniqueBooks = new Set(allNotes.map(note => note.bookId));
            const averageNotesPerBook = uniqueBooks.size > 0 ? totalNotes / uniqueBooks.size : 0;

            return {
                totalNotes,
                notesByType,
                topTags,
                averageNotesPerBook: Math.round(averageNotesPerBook * 100) / 100
            };
        } catch (error) {
            throw new Error(`Failed to get note statistics: ${error}`);
        }
    }

    async bulkCreate(notes: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Note[]> {
        const now = new Date();
        const notesWithIds = notes.map(note => {
            // Validate each note
            const validation = validateNote(note);
            if (!validation.isValid) {
                throw new ValidationError(`Invalid note data`, validation.errors);
            }

            return {
                id: crypto.randomUUID(),
                ...note,
                createdAt: now,
                updatedAt: now
            } as Note;
        });

        try {
            await this.db.notes.bulkAdd(notesWithIds);
            return notesWithIds;
        } catch (error) {
            throw new Error(`Failed to bulk create notes: ${error}`);
        }
    }

    async addTag(noteId: string, tag: string): Promise<Note> {
        const note = await this.findById(noteId);
        if (!note) {
            throw new NotFoundError('Note not found');
        }

        const tags = note.tags || [];
        if (!tags.includes(tag)) {
            tags.push(tag);
            return await this.update(noteId, { tags });
        }

        return note;
    }

    async removeTag(noteId: string, tag: string): Promise<Note> {
        const note = await this.findById(noteId);
        if (!note) {
            throw new NotFoundError('Note not found');
        }

        const tags = note.tags || [];
        const filteredTags = tags.filter(t => t !== tag);

        return await this.update(noteId, { tags: filteredTags });
    }

    async getAllTags(): Promise<string[]> {
        try {
            const allNotes = await this.findAll();
            const tagSet = new Set<string>();

            allNotes.forEach(note => {
                if (note.tags) {
                    note.tags.forEach(tag => tagSet.add(tag));
                }
            });

            return Array.from(tagSet).sort();
        } catch (error) {
            throw new Error(`Failed to get all tags: ${error}`);
        }
    }

    async findDuplicates(bookId: string, content: string, type: NoteType, page?: number): Promise<Note[]> {
        try {
            let query = this.db.notes
                .where('bookId')
                .equals(bookId)
                .and(note => note.content === content && note.type === type);

            if (page !== undefined) {
                query = query.and(note => note.page === page);
            }

            return await query.toArray();
        } catch (error) {
            throw new Error(`Failed to find duplicate notes: ${error}`);
        }
    }
}