/**
 * Streak Calculation Utilities
 * 
 * Computes reading streaks based on consecutive local-calendar days
 * with at least one session. Multiple sessions on one day count as
 * one streak day.
 */
import { getDistinctSessionDates } from '../db/repositories/reading-sessions';
import type { ReadingStreakSummary } from '../types';
import { getTodayStr, getYesterdayStr } from '../utils/ui-state';

/**
 * Compute the full streak summary from persisted session dates.
 */
export async function computeStreak(): Promise<ReadingStreakSummary> {
    const dates = await getDistinctSessionDates(); // sorted descending
    return calculateStreakFromDates(dates);
}

/**
 * Pure calculation function for streak logic.
 * Accepts sorted descending date strings (YYYY-MM-DD).
 */
export function calculateStreakFromDates(sortedDatesDesc: string[]): ReadingStreakSummary {
    if (sortedDatesDesc.length === 0) {
        return {
            currentStreakDays: 0,
            longestStreakDays: 0,
            streakStatus: 'none',
            daysReadThisWeek: 0,
        };
    }

    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    // Dedupe and sort ascending
    const uniqueDates = [...new Set(sortedDatesDesc)].sort();

    // Compute all streaks
    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1] + 'T00:00:00');
        const currDate = new Date(uniqueDates[i] + 'T00:00:00');
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            tempStreak++;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Current streak: count backwards from the most recent date
    // The streak is "active" if the latest date is today or yesterday
    const latestDate = uniqueDates[uniqueDates.length - 1];
    const isActive = latestDate === today || latestDate === yesterday;

    currentStreak = 1;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const currDate = new Date(uniqueDates[i + 1] + 'T00:00:00');
        const prevDate = new Date(uniqueDates[i] + 'T00:00:00');
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
        } else {
            break;
        }
    }

    // Days read this week (trailing 7-day window)
    const todayDate = new Date(today + 'T00:00:00');
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(weekAgo.getDate() - 6); // 7-day window inclusive
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const daysReadThisWeek = uniqueDates.filter(d => d >= weekAgoStr && d <= today).length;

    // Determine streak status
    let streakStatus: ReadingStreakSummary['streakStatus'];
    if (!isActive) {
        streakStatus = 'broken';
        // When broken, current streak is 0 (the active streak is over)
        currentStreak = 0;
    } else {
        streakStatus = 'active';
    }

    return {
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        lastReadingDate: latestDate,
        streakStatus,
        daysReadThisWeek,
    };
}
