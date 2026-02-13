# Quickstart: Twitter-First Note Sharing Enhancements

**Feature**: 001-twitter-note-sharing  
**Date**: 2026-02-13

## Goal

Validate that sharing and copy behaviors are Twitter-friendly, include linked highlight context, and expose a random top-of-index suggestion with direct share.

## Prerequisites

- Node.js 18+
- Project dependencies installed
- Existing note/book data available in local JSON storage

## 1) Start the app

1. Run dev server.
2. Open the library/index page.

Expected:

- A random suggestion card is visible at top when data exists.
- If no data exists, an empty-state message is shown for suggestion area.

## 2) Validate User Story 1 (P1)

### Share note with associated highlight

1. Open a book containing a note linked to a highlight.
2. Trigger share on the note.
3. Inspect generated share output (native share text or clipboard fallback).

Expected:

- Note text is quoted.
- Associated highlight text is quoted and included automatically.
- Attribution includes book title (and author when available).

### Share note without associated highlight

1. Pick a standalone note.
2. Trigger share.

Expected:

- Note text is quoted.
- No empty highlight block appears.
- Attribution still present.

## 3) Validate User Story 2 (P2)

### Copy highlight and note

1. Copy one highlight.
2. Paste output into any text editor.
3. Copy one note.
4. Paste output.

Expected for both:

- Text is quote-formatted.
- Attribution line includes book context.
- Success/failure feedback is visible after action.

## 4) Validate User Story 3 (P3)

### Share from random suggestion

1. On index page, use share action on random suggestion card.
2. Repeat refresh/suggestion actions several times in same session.

Expected:

- Share succeeds via native share or clipboard fallback.
- Output follows the same format as regular note/highlight sharing.
- Immediate repeats are reduced when multiple items are available.

## 5) Edge-case checks

1. Linked highlight exists but text is empty/whitespace.
2. Book has missing author metadata.
3. Suggested item is deleted before action.

Expected:

- Empty linked highlight is omitted safely.
- Attribution falls back to title-only when author missing.
- Stale suggestion re-rolls or shows safe empty-state feedback.

## Formatter edge-case behavior reference

- If a linked highlight exists but resolves to empty/whitespace text, it is excluded from both copy and share output.
- Attribution always includes book title; author is appended only when present.
- Truncation applies to quoted body text first and preserves attribution line.
- Copy and share are generated from the same canonical formatter to keep output consistent.

## 6) Test guidance

- Unit tests:
  - formatting utility (quote/attribution/truncation)
  - random selector no-immediate-repeat behavior
- Integration tests:
  - note + associated highlight share output
- E2E tests:
  - index top suggestion share flow
  - Web Share fallback to clipboard
  - keyboard-accessible share control behavior
