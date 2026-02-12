// Google Books API integration for fetching book covers and metadata
// API Documentation: https://developers.google.com/books/docs/v1/using

export interface GoogleBooksVolume {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
            small?: string;
            medium?: string;
            large?: string;
            extraLarge?: string;
        };
        industryIdentifiers?: Array<{
            type: string;
            identifier: string;
        }>;
    };
}

export interface GoogleBooksResponse {
    items?: GoogleBooksVolume[];
    totalItems: number;
}

/**
 * Clean up book title for better search results
 * Removes common noise like (Z-Library), ISBN codes, etc.
 */
function cleanTitle(title: string): string {
    return title
        // Remove Z-Library references
        .replace(/\(Z-Library[^)]*\)/gi, '')
        // Remove random codes at the end (like VSBTXDMVTWR6EBF5FI4L7R7WVWBOISPC)
        .replace(/\s+[A-Z0-9]{20,}\s*$/g, '')
        // Remove author name in parentheses at the end
        .replace(/\([^)]+\)\s*$/g, '')
        // Remove file format references
        .replace(/\.(epub|mobi|pdf|azw3?)\s*$/gi, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Clean up author name
 */
function cleanAuthor(author?: string): string | undefined {
    if (!author || author === 'Unknown') return undefined;

    return author
        .replace(/\(Z-Library[^)]*\)/gi, '')
        .replace(/;/g, ' ')
        .trim();
}

/**
 * Search for a book on Google Books API
 * @param title Book title
 * @param author Book author (optional)
 * @returns Book cover URL or null
 */
export async function fetchBookCover(
    title: string,
    author?: string
): Promise<string | null> {
    try {
        // Clean up title and author for better search
        const cleanedTitle = cleanTitle(title);
        const cleanedAuthor = cleanAuthor(author);

        console.log(`Searching for: "${cleanedTitle}"${cleanedAuthor ? ` by ${cleanedAuthor}` : ''}`);

        // Build search query
        let query = `intitle:${encodeURIComponent(cleanedTitle)}`;
        if (cleanedAuthor) {
            query += `+inauthor:${encodeURIComponent(cleanedAuthor)}`;
        }

        // Google Books API doesn't require an API key for basic usage
        // But you can add one for higher rate limits: &key=YOUR_API_KEY
        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Google Books API error: ${response.status}`);
            return null;
        }

        const data: GoogleBooksResponse = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log(`No cover found for: ${title}`);
            return null;
        }

        const volume = data.items[0];
        const imageLinks = volume.volumeInfo.imageLinks;

        if (!imageLinks) {
            return null;
        }

        // Prefer higher quality images
        // Replace http with https for secure connections
        const coverUrl = (
            imageLinks.large ||
            imageLinks.medium ||
            imageLinks.small ||
            imageLinks.thumbnail ||
            imageLinks.smallThumbnail
        )?.replace('http://', 'https://');

        return coverUrl || null;
    } catch (error) {
        console.error('Error fetching book cover:', error);
        return null;
    }
}

/**
 * Batch fetch covers for multiple books with rate limiting
 * @param books Array of books with title and author
 * @param delayMs Delay between requests (default 100ms)
 */
export async function fetchBookCovers(
    books: Array<{ title: string; author?: string }>,
    delayMs: number = 100
): Promise<Map<string, string>> {
    const covers = new Map<string, string>();

    for (const book of books) {
        const key = `${book.title}|${book.author || ''}`;
        const coverUrl = await fetchBookCover(book.title, book.author);

        if (coverUrl) {
            covers.set(key, coverUrl);
        }

        // Rate limiting: wait between requests
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return covers;
}
