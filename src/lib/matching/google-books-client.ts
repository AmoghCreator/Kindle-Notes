/**
 * Google Books Browser Client
 * 
 * Fetches book metadata from the Google Books API via browser fetch.
 * Includes outage-safe fallback — never blocks the calling workflow.
 */
import type { BookMatchCandidate } from '../types';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RESULTS = 5;

export interface GoogleBooksSearchResult {
  candidates: BookMatchCandidate[];
  providerAvailable: boolean;
  error?: string;
}

/**
 * Search Google Books by title (and optionally author).
 * Returns candidates with basic metadata. Never throws — returns
 * providerAvailable=false on failure.
 */
export async function searchGoogleBooks(
  title: string,
  author?: string
): Promise<GoogleBooksSearchResult> {
  try {
    let query = `intitle:${encodeURIComponent(title)}`;
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`;
    }

    const url = `${GOOGLE_BOOKS_API}?q=${query}&maxResults=${MAX_RESULTS}&fields=items(id,volumeInfo(title,authors,imageLinks,industryIdentifiers))`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        candidates: [],
        providerAvailable: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return { candidates: [], providerAvailable: true };
    }

    const candidates: BookMatchCandidate[] = data.items.map((item: any) => {
      const info = item.volumeInfo || {};
      const isbn13 = info.industryIdentifiers?.find(
        (id: any) => id.type === 'ISBN_13'
      )?.identifier;

      return {
        candidateId: item.id,
        title: info.title || 'Unknown',
        authors: info.authors || [],
        coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
        isbn13,
        source: 'google-books' as const,
        confidence: 0, // Will be scored by canonicalize.ts
      };
    });

    return { candidates, providerAvailable: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      candidates: [],
      providerAvailable: false,
      error: message,
    };
  }
}

/**
 * Get a single volume by Google Volume ID.
 */
export async function getGoogleBooksVolume(
  volumeId: string
): Promise<BookMatchCandidate | null> {
  try {
    const url = `${GOOGLE_BOOKS_API}/${volumeId}?fields=id,volumeInfo(title,authors,imageLinks,industryIdentifiers)`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const item = await response.json();
    const info = item.volumeInfo || {};
    const isbn13 = info.industryIdentifiers?.find(
      (id: any) => id.type === 'ISBN_13'
    )?.identifier;

    return {
      candidateId: item.id,
      title: info.title || 'Unknown',
      authors: info.authors || [],
      coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') || undefined,
      isbn13,
      source: 'google-books',
      confidence: 0,
    };
  } catch {
    return null;
  }
}
