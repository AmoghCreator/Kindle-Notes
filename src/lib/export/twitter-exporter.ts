import type { ShareTextPayload } from '../types';

export interface TwitterTruncationInput {
    primaryQuote: string;
    secondaryQuote?: string;
    attribution: string;
    maxLength?: number;
}

export function truncateForTwitter({
    primaryQuote,
    secondaryQuote,
    attribution,
    maxLength = 280,
}: TwitterTruncationInput): ShareTextPayload {
    const cleanPrimary = primaryQuote.trim();
    const cleanSecondary = secondaryQuote?.trim();
    const cleanAttribution = attribution.trim();

    const build = (first: string, second?: string) =>
        [first, second, cleanAttribution].filter(Boolean).join('\n');

    let fullText = build(cleanPrimary, cleanSecondary);
    if (fullText.length <= maxLength) {
        return {
            text: fullText,
            charCount: fullText.length,
            truncated: false,
            includesAssociatedHighlight: Boolean(cleanSecondary),
            attribution: cleanAttribution,
        };
    }

    const reserved = cleanAttribution.length + 1; // newline before attribution
    const budget = Math.max(20, maxLength - reserved);

    let secondaryBudget = cleanSecondary ? Math.floor(budget * 0.35) : 0;
    let primaryBudget = budget - secondaryBudget;

    const truncate = (value: string, limit: number) => {
        if (value.length <= limit) return value;
        const raw = value.slice(0, Math.max(1, limit - 1));
        const wordSafe = raw.replace(/\s+\S*$/, '').trim();
        const clipped = wordSafe.length >= 8 ? wordSafe : raw.trim();
        return `${clipped}…`;
    };

    let truncatedPrimary = truncate(cleanPrimary, primaryBudget);
    let truncatedSecondary = cleanSecondary
        ? truncate(cleanSecondary, secondaryBudget)
        : undefined;

    fullText = build(truncatedPrimary, truncatedSecondary);

    if (fullText.length > maxLength) {
        const overflow = fullText.length - maxLength;
        truncatedPrimary = truncate(truncatedPrimary, Math.max(8, truncatedPrimary.length - overflow));
        fullText = build(truncatedPrimary, truncatedSecondary);
    }

    if (fullText.length > maxLength && truncatedSecondary) {
        truncatedSecondary = undefined;
        fullText = build(truncatedPrimary);
    }

    if (fullText.length > maxLength) {
        const hardLimit = Math.max(8, maxLength - cleanAttribution.length - 2);
        truncatedPrimary = truncate(cleanPrimary, hardLimit);
        fullText = build(truncatedPrimary);
    }

    return {
        text: fullText,
        charCount: fullText.length,
        truncated: true,
        includesAssociatedHighlight: Boolean(truncatedSecondary),
        attribution: cleanAttribution,
    };
}
