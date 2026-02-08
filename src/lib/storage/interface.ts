// Storage service interface for data operations
import type { Book, Note, Upload, SearchQuery, SearchResult } from '@/lib/types';

export interface StorageService {
    // Books
    createBook(book: Omit<Book, 'id' | 'createdAt' | 'lastModifiedAt'>): Promise<Book>;
    getBooks(): Promise<Book[]>;
    getBook(id: string): Promise<Book | null>;
    updateBook(id: string, updates: Partial<Book>): Promise<Book>;
    deleteBook(id: string): Promise<void>;

    // Notes
    createNote(note: Omit<Note, 'id' | 'createdAt' | 'lastModifiedAt'>): Promise<Note>;
    getNotes(bookId?: string): Promise<Note[]>;
    getNote(id: string): Promise<Note | null>;
    updateNote(id: string, updates: Partial<Note>): Promise<Note>;
    deleteNote(id: string): Promise<void>;

    // Search
    searchNotes(query: SearchQuery): Promise<SearchResult>;

    // Uploads
    recordUpload(upload: Omit<Upload, 'id'>): Promise<Upload>;
    getUploads(): Promise<Upload[]>;

    // Utility
    exportAllData(): Promise<{ books: Book[]; notes: Note[]; uploads: Upload[] }>;
    clearAllData(): Promise<void>;
}