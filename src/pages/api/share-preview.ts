import type { APIRoute } from 'astro';
import { getAllBooks, getAllNotes } from '../../lib/server/storage';
import { buildShareText, resolveShareableItem } from '../../lib/export/share-format';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const itemId = String(body?.itemId || '').trim();
        const mode = body?.mode === 'copy' ? 'copy' : 'share';
        const maxLength = Number(body?.maxLength || 280);

        if (!itemId) {
            return new Response(
                JSON.stringify({ code: 'INVALID_INPUT', message: 'itemId is required' }),
                { status: 422, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const [notes, books] = await Promise.all([getAllNotes(), getAllBooks()]);
        const item = resolveShareableItem(itemId, notes, books);

        if (!item) {
            return new Response(
                JSON.stringify({ code: 'NOT_FOUND', message: 'Note/highlight not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const payload = buildShareText(item, {
            mode,
            includeAssociatedHighlight: body?.includeAssociatedHighlight !== false,
            maxLength: Number.isFinite(maxLength) ? maxLength : 280,
        });

        return new Response(
            JSON.stringify({
                ...payload,
                metadata: {
                    itemId: item.itemId,
                    itemType: item.itemType,
                    bookId: item.bookId,
                    bookTitle: item.bookTitle,
                    bookAuthor: item.bookAuthor || null,
                    associatedHighlightId: item.associatedHighlightId || null,
                },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ code: 'SERVER_ERROR', message: 'Failed to generate share preview' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
};
