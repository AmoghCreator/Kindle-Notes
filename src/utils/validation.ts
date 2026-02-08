// Input validation utilities
import type { Book, Note, Upload } from '@/lib/types';

export class ValidationError extends Error {
    constructor(
        message: string,
        public field: string,
        public value: any
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Book validation
export function validateBook(data: Partial<Book>): void {
    if (!data.title || typeof data.title !== 'string') {
        throw new ValidationError('Title is required and must be a string', 'title', data.title);
    }

    if (data.title.length > 200) {
        throw new ValidationError('Title must be 200 characters or less', 'title', data.title);
    }

    if (data.author && data.author.length > 100) {
        throw new ValidationError('Author must be 100 characters or less', 'author', data.author);
    }

    if (data.tags) {
        if (!Array.isArray(data.tags)) {
            throw new ValidationError('Tags must be an array', 'tags', data.tags);
        }

        if (data.tags.length > 20) {
            throw new ValidationError('Maximum 20 tags allowed per book', 'tags', data.tags);
        }

        data.tags.forEach((tag, index) => {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                throw new ValidationError(`Tag at index ${index} must be a non-empty string`, 'tags', tag);
            }
        });
    }
}

// Note validation  
export function validateNote(data: Partial<Note>): void {
    if (!data.text || typeof data.text !== 'string') {
        throw new ValidationError('Text is required and must be a string', 'text', data.text);
    }

    if (data.text.length > 5000) {
        throw new ValidationError('Note text must be 5000 characters or less', 'text', data.text);
    }

    if (!data.bookId || typeof data.bookId !== 'string') {
        throw new ValidationError('Book ID is required and must be a string', 'bookId', data.bookId);
    }

    if (data.userNote && data.userNote.length > 2000) {
        throw new ValidationError('User note must be 2000 characters or less', 'userNote', data.userNote);
    }

    if (data.type && !['highlight', 'note', 'bookmark'].includes(data.type)) {
        throw new ValidationError('Note type must be highlight, note, or bookmark', 'type', data.type);
    }

    if (data.tags) {
        if (!Array.isArray(data.tags)) {
            throw new ValidationError('Tags must be an array', 'tags', data.tags);
        }

        if (data.tags.length > 50) {
            throw new ValidationError('Maximum 50 tags allowed per note', 'tags', data.tags);
        }

        data.tags.forEach((tag, index) => {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                throw new ValidationError(`Tag at index ${index} must be a non-empty string`, 'tags', tag);
            }
        });
    }
}

// Upload validation
export function validateUpload(data: Partial<Upload>): void {
    if (!data.filename || typeof data.filename !== 'string') {
        throw new ValidationError('Filename is required and must be a string', 'filename', data.filename);
    }

    if (!data.fileSize || typeof data.fileSize !== 'number' || data.fileSize <= 0) {
        throw new ValidationError('File size must be a positive number', 'fileSize', data.fileSize);
    }

    if (data.fileSize > 50 * 1024 * 1024) { // 50MB
        throw new ValidationError('File size must be 50MB or less', 'fileSize', data.fileSize);
    }

    if (data.format && !['kindle-txt', 'csv', 'json'].includes(data.format)) {
        throw new ValidationError('Format must be kindle-txt, csv, or json', 'format', data.format);
    }
}

// File validation for uploads
export function validateFileForUpload(file: File): void {
    if (!file) {
        throw new ValidationError('File is required', 'file', file);
    }

    if (file.size === 0) {
        throw new ValidationError('File cannot be empty', 'file', file);
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
        throw new ValidationError('File size must be 50MB or less', 'file', file);
    }

    const allowedExtensions = ['.txt', '.csv', '.json'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        throw new ValidationError(
            `File type not supported. Allowed types: ${allowedExtensions.join(', ')}`,
            'file',
            fileExtension
        );
    }
}

// Sanitization utilities
export function sanitizeString(input: string, maxLength?: number): string {
    const sanitized = input.trim().replace(/\s+/g, ' ');
    return maxLength ? sanitized.slice(0, maxLength) : sanitized;
}

export function sanitizeTags(tags: string[]): string[] {
    return tags
        .map(tag => sanitizeString(tag.toLowerCase()))
        .filter(tag => tag.length > 0)
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
        .slice(0, 50); // Limit to 50 tags
}

export function sanitizeSearchQuery(query: string): string {
    return query
        .trim()
        .replace(/[<>]/g, '') // Remove potential XSS characters
        .slice(0, 200); // Limit search query length
}