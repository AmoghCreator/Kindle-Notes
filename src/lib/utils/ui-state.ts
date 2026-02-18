/**
 * UI State Contract Helpers
 * 
 * Provides consistent loading, error, and empty state contracts
 * for client-side rendered components.
 */

export type UIStateKind = 'loading' | 'error' | 'empty' | 'ready';

export interface UIState<T = unknown> {
    kind: UIStateKind;
    data?: T;
    error?: string;
    emptyMessage?: string;
    emptyAction?: { label: string; href: string };
}

/**
 * Create a loading state.
 */
export function loading<T>(): UIState<T> {
    return { kind: 'loading' };
}

/**
 * Create an error state with an actionable message.
 */
export function error<T>(message: string): UIState<T> {
    return { kind: 'error', error: message };
}

/**
 * Create an empty state with guidance.
 */
export function empty<T>(message: string, action?: { label: string; href: string }): UIState<T> {
    return { kind: 'empty', emptyMessage: message, emptyAction: action };
}

/**
 * Create a ready state with data.
 */
export function ready<T>(data: T): UIState<T> {
    return { kind: 'ready', data };
}

/**
 * Render helper: returns true only when state is ready with data.
 */
export function isReady<T>(state: UIState<T>): state is UIState<T> & { data: T } {
    return state.kind === 'ready' && state.data !== undefined;
}

/**
 * Get a user-friendly date label for today/yesterday/other dates.
 */
export function getDateLabel(dateStr: string, today: string, yesterday: string): string {
    if (dateStr === today) return "Today's Reading";
    if (dateStr === yesterday) return "Yesterday's Reading";
    // Format as readable date
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Get yesterday's date as YYYY-MM-DD string.
 */
export function getYesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

/**
 * Format a page range for display.
 */
export function formatPageRange(pageStart: number, pageEnd: number): string {
    const pagesRead = pageEnd - pageStart + 1;
    return `pp. ${pageStart}–${pageEnd} · ${pagesRead} page${pagesRead !== 1 ? 's' : ''}`;
}
