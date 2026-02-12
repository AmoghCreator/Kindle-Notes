import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseKindleFile } from '../../lib/parsers/kindle-parser';
import {
    addBook,
    addNotesWithDeduplication,
    getAllNotes,
    updateBookNoteCount,
    createUploadSession,
    updateUploadSession
} from '../../lib/server/storage';

// This endpoint needs server-side rendering
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    let sessionId: string | null = null;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create upload session
        sessionId = await createUploadSession(file.name, file.size);

        // Read file content
        const content = await file.text();

        // Save original file as backup
        const backupDir = path.join(process.cwd(), 'data', 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        
        // Generate unique filename with timestamp and hash
        const fileHash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const backupFilename = `${timestamp}_${fileHash}_${safeFilename}`;
        const backupPath = path.join(backupDir, backupFilename);
        
        await fs.writeFile(backupPath, content, 'utf-8');
        console.log(`Backup saved: ${backupPath}`);

        // Parse Kindle clippings
        const { books, notes, metadata } = await parseKindleFile(content, file.name);

        // Save books with deduplication and track ID mapping
        const bookIdMap = new Map<string, string>();
        for (const book of books) {
            const savedBook = await addBook(book);
            // Map parsed book ID to actual saved book ID (handles deduplication)
            bookIdMap.set(book.id, savedBook.id);
        }

        // Update note bookIds to match deduplicated book IDs
        const notesWithCorrectBookIds = notes.map(note => ({
            ...note,
            bookId: bookIdMap.get(note.bookId) || note.bookId
        }));

        // Save notes with deduplication
        const deduplicationResult = await addNotesWithDeduplication(notesWithCorrectBookIds);

        // Update book note counts
        const allNotes = await getAllNotes();
        const bookNoteMap = new Map<string, number>();
        for (const note of allNotes) {
            bookNoteMap.set(note.bookId, (bookNoteMap.get(note.bookId) || 0) + 1);
        }

        for (const [bookId, count] of bookNoteMap) {
            await updateBookNoteCount(bookId, count);
        }

        // Complete upload session with stats
        const stats = {
            booksAdded: books.length,
            booksUpdated: 0, // Could track this if we detect updates vs new books
            notesAdded: deduplicationResult.added,
            notesSkipped: deduplicationResult.skipped,
            parseErrors: deduplicationResult.errors?.length || 0
        };

        await updateUploadSession(sessionId, 'completed', stats);

        return new Response(
            JSON.stringify({
                success: true,
                sessionId,
                stats,
                message: `Successfully imported ${books.length} books with ${deduplicationResult.added} new notes (${deduplicationResult.skipped} duplicates skipped)`
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Upload error:', error);

        // Update session as failed if it was created
        if (sessionId) {
            await updateUploadSession(
                sessionId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: 'Failed to process file',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
