# User Journey Maps: Reading Session Tracker & Book Standardization

**Feature**: 001-reading-session-tracker
**Date**: 2026-02-18
**Purpose**: Document end-to-end user flows for daily session logging, canonical matching, and tracker experience

---

## Journey 1: Log a Daily Reading Session (Happy Path)

**Actor**: Returning user with existing library
**Goal**: Record today's reading progress quickly

```
1. User opens homepage
   → Sees Reading Tracker header with yesterday's/latest session
   → Clicks "Log Today's Reading" CTA

2. Navigates to /sessions page
   → Session form is visible at top
   → Date defaults to today

3. Types book title in search field
   → Debounced search triggers Google Books lookup
   → Candidates appear as dropdown/suggestions
   → Top match (score ≥ 0.90) is auto-highlighted

4. Selects book from suggestions
   → Canonical book identity is resolved
   → Cover thumbnail and canonical title shown as confirmation
   → Audit metadata recorded (source: manual-entry, resolution: auto, score)

5. Enters page range (start: 45, end: 78)
   → Inline validation confirms pageEnd ≥ pageStart

6. Optionally types insight
   → Character counter shows remaining (2000 max)

7. Clicks "Save Session"
   → Session persisted to Dexie readingSessions table
   → Success toast: "Session saved!"
   → New entry appears at top of timeline list

8. Returns to homepage
   → Tracker header now shows today's session
   → Streak counter updates
```

**Duration target**: < 60 seconds (SC-001)

---

## Journey 2: Log Session with Confirmation Band Match (0.70–0.89)

**Actor**: User entering a book with ambiguous title
**Goal**: Ensure correct canonical identity even with fuzzy input

```
1. User types "atomic habits" in book search
   → Google Books returns multiple candidates
   → Top result scores 0.82 (confirmation band)

2. Confirmation UI appears
   → Shows top 3 candidates with confidence scores
   → Radio buttons: each candidate + "None of these"
   → Message: "Did you mean one of these?"

3. User selects "Atomic Habits by James Clear"
   → Resolution mode: user-confirmed
   → Canonical book identity created/linked
   → Audit records confidence=0.82, resolution=user-confirmed

4. Proceeds with page entry and save (same as Journey 1, step 5+)
```

---

## Journey 3: Log Session with Provisional Fallback

**Actor**: User entering obscure/self-published book OR offline scenario
**Goal**: Log session without blocking on metadata

```
1. User types "My Uncle's Fishing Guide 2024" in book search
   → Google Books returns no strong matches (all < 0.70)
   → OR: Google Books API is unreachable

2. Provisional notice appears
   → "No confident match found. Your entry will be saved as provisional."
   → Book title preserved exactly as entered

3. User continues with page entry and saves
   → Provisional canonical record created (matchStatus: unverified)
   → Session links to provisional canonical ID
   → Audit records resolution=provisional, provider=none or score

4. Session appears in timeline with provisional indicator
   → Can be reconciled later if canonical match found
```

---

## Journey 4: Kindle Import with Canonical Matching

**Actor**: User uploading new My Clippings.txt
**Goal**: Import notes with automatic canonical identity resolution

```
1. User navigates to import page
   → Drops/selects My Clippings.txt file

2. Parser processes file
   → Entries extracted (books + notes)
   → For each unique book title+author pair:
     a. Normalize title for matching
     b. Query Google Books for candidates
     c. Apply threshold scoring

3. For high-confidence matches (≥ 0.90):
   → Auto-link to existing/new canonical identity
   → Notes inherit canonical book ID
   → Audit: resolution=auto, source=kindle-import

4. For confirmation band (0.70–0.89):
   → Queue for user review post-import
   → Notes stored with provisional link

5. For low-confidence (< 0.70):
   → Create provisional canonical record
   → Notes linked to provisional ID

6. Import completes
   → Summary shows: N books matched, M need review, K provisional
   → User can review confirmation-band items if any

7. All imported notes discoverable via canonical book pages
```

---

## Journey 5: View Reading History on Book Page

**Actor**: User browsing a specific book
**Goal**: See unified notes + reading sessions for one book

```
1. User navigates to book detail page (/books/[id])
   → Page loads with book header and notes

2. Reading Sessions section visible below notes
   → Shows sessions linked by canonical book ID
   → Ordered reverse-chronologically
   → Each entry: date, page range, pages read, insight excerpt

3. If no sessions exist for this book:
   → Empty state: "No reading sessions yet"
   → CTA: "Log a Reading Session" links to /sessions with book pre-selected

4. Unified timeline (if implemented):
   → Merges notes and sessions chronologically
   → Visual distinction between note/highlight events and session events
```

---

## Journey 6: Track Reading Streaks

**Actor**: Returning user checking progress
**Goal**: See streak motivation and weekly activity

```
1. User opens homepage
   → Tracker header shows streak summary
   → "🔥 5-day streak · 4 days this week"

2. Streak calculation:
   → Count distinct sessionDate values in consecutive sequence
   → Include today/yesterday as active boundary
   → Week counter: distinct days in trailing 7-day window

3. If streak is broken:
   → "Your streak ended at 5 days. Start a new one!"
   → CTA to log a session

4. If no streak:
   → "Start your reading streak today!"
```

---

## Edge Cases Documented

| Scenario | Expected Behavior |
|----------|------------------|
| Same book, two sessions same day | Both saved; streak counts as 1 day |
| Page overlap between sessions | Allowed (no page range validation across sessions) |
| Very long insight (> 2000 chars) | Truncated at 2000 with counter warning |
| Session date in the future | Blocked by validation |
| Duplicate canonical book from different flows | Merged via alias mapping |
| Browser clears IndexedDB | Data lost (no backup); empty state shown |
| Google Books rate limit | Provisional fallback, no blocking |

---

## Success Criteria Mapping

| Journey | Success Criteria |
|---------|-----------------|
| Journey 1 | SC-001 (< 60s completion) |
| Journey 1, 5, 6 | SC-002 (tracker summary completeness) |
| Journey 2, 3, 4 | SC-003 (duplicate consolidation) |
| Journey 6 | SC-004 (streak retention proxy) |
| Journey 5 | SC-005 (per-book session visibility) |
