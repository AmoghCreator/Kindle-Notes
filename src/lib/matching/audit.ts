/**
 * Canonical Link Audit Helpers
 * 
 * Builds CanonicalLinkAudit value objects for reading session
 * and import canonical resolution events.
 */
import type { CanonicalLinkAudit } from '../types';

/**
 * Create an audit record for an auto-linked match (score >= 0.90).
 */
export function createAutoLinkAudit(
    sourceFlow: CanonicalLinkAudit['sourceFlow'],
    confidenceScore: number,
    providerCandidateId: string
): CanonicalLinkAudit {
    return {
        sourceFlow,
        resolutionMode: 'auto',
        confidenceScore,
        provider: 'google-books',
        providerCandidateId,
        resolvedAt: new Date(),
    };
}

/**
 * Create an audit record for a user-confirmed match (0.70–0.89).
 */
export function createUserConfirmedAudit(
    sourceFlow: CanonicalLinkAudit['sourceFlow'],
    confidenceScore: number,
    providerCandidateId: string
): CanonicalLinkAudit {
    return {
        sourceFlow,
        resolutionMode: 'user-confirmed',
        confidenceScore,
        provider: 'google-books',
        providerCandidateId,
        resolvedAt: new Date(),
    };
}

/**
 * Create an audit record for a provisional/fallback match (< 0.70 or no provider).
 */
export function createProvisionalAudit(
    sourceFlow: CanonicalLinkAudit['sourceFlow'],
    confidenceScore?: number,
    providerCandidateId?: string
): CanonicalLinkAudit {
    return {
        sourceFlow,
        resolutionMode: 'provisional',
        confidenceScore,
        provider: providerCandidateId ? 'google-books' : 'none',
        providerCandidateId,
        resolvedAt: new Date(),
    };
}

/**
 * Create an audit record based on threshold band determination.
 */
export function createAuditFromBand(
    sourceFlow: CanonicalLinkAudit['sourceFlow'],
    band: 'auto' | 'confirm' | 'provisional',
    confidenceScore?: number,
    providerCandidateId?: string
): CanonicalLinkAudit {
    switch (band) {
        case 'auto':
            return createAutoLinkAudit(sourceFlow, confidenceScore!, providerCandidateId!);
        case 'confirm':
            return createUserConfirmedAudit(sourceFlow, confidenceScore!, providerCandidateId!);
        case 'provisional':
            return createProvisionalAudit(sourceFlow, confidenceScore, providerCandidateId);
    }
}
