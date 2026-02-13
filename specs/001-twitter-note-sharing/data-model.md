# Data Model: Twitter-First Note Sharing Enhancements

**Feature**: 001-twitter-note-sharing  
**Phase**: 1 (Design)  
**Date**: 2026-02-13

## Overview

This feature reuses existing `Book` and `Note` records, and introduces lightweight view/contract models for unified share formatting and top-of-index random suggestion.

## Entities

## 1) ShareableItem (Derived View Entity)

Represents any note/highlight the UI can copy/share.

| Field | Type | Required | Description |
|---|---|---|---|
| `itemId` | `string` | Yes | Source note ID |
| `itemType` | `'note' \| 'highlight'` | Yes | Source content type |
| `text` | `string` | Yes | Primary item text |
| `bookId` | `string` | Yes | Source book reference |
| `bookTitle` | `string` | Yes | Attribution title |
| `bookAuthor` | `string` | No | Attribution author |
| `associatedHighlightId` | `string` | No | For notes, optional linked highlight |
| `associatedHighlightText` | `string` | No | Non-empty linked highlight content |

### Validation rules

1. `text` must be non-empty after trimming.
2. If `itemType === 'highlight'`, `associatedHighlightId` and `associatedHighlightText` must be omitted.
3. If `associatedHighlightText` exists, it must be non-empty after trimming.

## 2) ShareTextPayload (Generated Output Entity)

Canonical payload used by both copy and share actions.

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | Final formatted quote + attribution text |
| `charCount` | `number` | Yes | Character count for diagnostics/UI |
| `truncated` | `boolean` | Yes | Whether content was truncated |
| `includesAssociatedHighlight` | `boolean` | Yes | Whether linked highlight was included |
| `attribution` | `string` | Yes | Final attribution line |

### Validation rules

1. `text` must include an attribution line with `bookTitle`.
2. `includesAssociatedHighlight=true` only if associated highlight content is present and included.
3. `charCount` must match generated text length metric used by implementation.

## 3) RandomSuggestion (Home Page View Entity)

Single top-of-page card model.

| Field | Type | Required | Description |
|---|---|---|---|
| `suggestionId` | `string` | Yes | Stable display ID |
| `itemId` | `string` | Yes | Source note ID |
| `itemType` | `'note' \| 'highlight'` | Yes | Label for UI |
| `previewText` | `string` | Yes | Display snippet |
| `bookTitle` | `string` | Yes | Display attribution context |
| `bookAuthor` | `string` | No | Optional attribution context |
| `canShare` | `boolean` | Yes | Whether direct share action is enabled |

### Validation rules

1. Suggestion must reference existing content at render time.
2. If referenced content is missing, selector must re-roll once; if none found, UI shows empty state.
3. `canShare=false` only when no valid content exists.

## Relationships

1. `RandomSuggestion.itemId` references one `Note.id`.
2. `ShareableItem.itemId` references one `Note.id`.
3. `ShareableItem.bookId` references one `Book.id`.
4. For note-based sharing, `ShareableItem.associatedHighlightId` may reference one `Note.id` where `type='highlight'`.

## State Transitions

## Share action state

`idle → generating → ready → (shared | copied) → completed`

Error path:

`generating → failed`

## Random suggestion card state

`loading (SSR/frontmatter) → ready`

Fallback states:

- `ready → stale-reference-detected → rerolled-ready`
- `ready → stale-reference-detected → empty`

## Notes on Persistence

- No new required persisted storage tables/files.
- Optional session-only recency data for random de-duplication can be kept in browser session storage.
