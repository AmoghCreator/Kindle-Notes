/**
 * Tracker Session Summary Helper
 * 
 * Implements tracker header selection logic:
 *   today session > yesterday session > latest historical > empty CTA
 */
import { getTrackerSessions, getMostRecentSession } from '../db/repositories/reading-sessions';
import { getCanonicalBook } from '../db/repositories/canonical-books';
import type { ReadingSession, CanonicalBookIdentity } from '../types';
import { getTodayStr, getYesterdayStr } from '../utils/ui-state';

export interface TrackerSummary {
  state: 'today' | 'yesterday' | 'historical' | 'empty';
  session?: ReadingSession;
  book?: CanonicalBookIdentity;
  dateLabel: string;
}

/**
 * Get the tracker summary for the header display.
 * Priority: today > yesterday > most recent > empty.
 */
export async function getTrackerSummary(): Promise<TrackerSummary> {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  const { todaySession, yesterdaySession, latestSession } = await getTrackerSessions(today, yesterday);

  if (todaySession) {
    const book = await getCanonicalBook(todaySession.canonicalBookId);
    return {
      state: 'today',
      session: todaySession,
      book: book || undefined,
      dateLabel: "Today's Reading",
    };
  }

  if (yesterdaySession) {
    const book = await getCanonicalBook(yesterdaySession.canonicalBookId);
    return {
      state: 'yesterday',
      session: yesterdaySession,
      book: book || undefined,
      dateLabel: "Yesterday's Reading",
    };
  }

  if (latestSession) {
    const book = await getCanonicalBook(latestSession.canonicalBookId);
    const date = new Date(latestSession.sessionDate + 'T00:00:00');
    const dateLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return {
      state: 'historical',
      session: latestSession,
      book: book || undefined,
      dateLabel: `Last Read: ${dateLabel}`,
    };
  }

  return { state: 'empty', dateLabel: '' };
}
