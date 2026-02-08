// Web Worker for background Kindle text file parsing
// This runs in a separate thread to prevent UI blocking

const KINDLE_PATTERNS = {
    BOOK_TITLE: /^(.+?)\s*\(([^)]+)\)\s*$/,
    METADATA: /^-\s*Your\s+(Highlight|Note|Bookmark)\s+on\s+(?:page\s+(\d+)\s*\|?\s*)?(?:location\s+([\d-]+)\s*\|?\s*)?Added\s+on\s+(.+)$/i,
    SEPARATOR: '==========',
    LOOSE_TITLE: /^([^(]+?)(?:\s*\(([^)]+)\))?\s*$/,
    LOOSE_METADATA: /^-.*?(Highlight|Note|Bookmark).*?(\d{4}).*$/i
};

const DATE_PATTERNS = [
    /^(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
    /^(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z?$/
];

function parseKindleDate(dateString) {
    // Try each date pattern
    for (const pattern of DATE_PATTERNS) {
        const match = dateString.match(pattern);
        if (match) {
            try {
                return new Date(dateString);
            } catch {
                continue;
            }
        }
    }

    // Fallback to current date if parsing fails
    return new Date();
}

function extractBookInfo(titleLine, strictMode = false) {
    // Try strict pattern first
    let match = titleLine.match(KINDLE_PATTERNS.BOOK_TITLE);
    if (match) {
        return {
            title: match[1].trim(),
            author: match[2].trim()
        };
    }

    // Try loose pattern if not in strict mode
    if (!strictMode) {
        match = titleLine.match(KINDLE_PATTERNS.LOOSE_TITLE);
        if (match) {
            return {
                title: match[1].trim(),
                author: match[2]?.trim() || 'Unknown Author'
            };
        }
    }

    return null;
}

function extractMetadata(metadataLine, strictMode = false) {
    // Try strict pattern first
    let match = metadataLine.match(KINDLE_PATTERNS.METADATA);
    if (match) {
        return {
            type: match[1].toLowerCase(),
            page: match[2] ? parseInt(match[2], 10) : null,
            location: match[3] || null,
            timestamp: parseKindleDate(match[4])
        };
    }

    // Try loose pattern if not in strict mode
    if (!strictMode) {
        match = metadataLine.match(KINDLE_PATTERNS.LOOSE_METADATA);
        if (match) {
            return {
                type: match[1].toLowerCase(),
                page: null,
                location: null,
                timestamp: new Date() // Use current date as fallback
            };
        }
    }

    return null;
}

function parseEntryBatch(entries, batchId, options = {}) {
    const results = [];
    const errors = [];
    const warnings = [];
    const { strictMode = false, sessionId, startIndex = 0 } = options;

    let currentBook = null;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i].trim();
        if (!entry) continue;

        try {
            const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                warnings.push(`Entry ${startIndex + i}: Insufficient lines, skipping`);
                continue;
            }

            // First line should be book title or metadata
            const firstLine = lines[0];

            // Check if this is a book title line
            const bookInfo = extractBookInfo(firstLine, strictMode);
            if (bookInfo) {
                currentBook = bookInfo;

                // Look for metadata in the second line
                if (lines.length < 3) {
                    warnings.push(`Entry ${startIndex + i}: Book title found but no content, skipping`);
                    continue;
                }

                const metadataLine = lines[1];
                const metadata = extractMetadata(metadataLine, strictMode);
                if (!metadata) {
                    errors.push(`Entry ${startIndex + i}: Could not parse metadata: ${metadataLine}`);
                    continue;
                }

                // Content is everything after metadata line
                const content = lines.slice(2).join('\n').trim();
                if (!content && (metadata.type === 'highlight' || metadata.type === 'note')) {
                    warnings.push(`Entry ${startIndex + i}: Empty content for ${metadata.type}`);
                }

                results.push({
                    id: `${sessionId}-${startIndex + i}`,
                    sessionId,
                    bookIdentifier: `${currentBook.title}|${currentBook.author}`,
                    entryType: metadata.type,
                    content: content || '',
                    location: metadata.location,
                    timestamp: metadata.timestamp,
                    parseIndex: startIndex + i,
                    book: currentBook,
                    metadata
                });
            } else {
                // This might be a continuation entry for the current book
                if (!currentBook) {
                    errors.push(`Entry ${startIndex + i}: No book context found for entry starting with: ${firstLine}`);
                    continue;
                }

                const metadata = extractMetadata(firstLine, strictMode);
                if (!metadata) {
                    errors.push(`Entry ${startIndex + i}: Could not parse metadata: ${firstLine}`);
                    continue;
                }

                const content = lines.slice(1).join('\n').trim();
                if (!content && (metadata.type === 'highlight' || metadata.type === 'note')) {
                    warnings.push(`Entry ${startIndex + i}: Empty content for ${metadata.type}`);
                }

                results.push({
                    id: `${sessionId}-${startIndex + i}`,
                    sessionId,
                    bookIdentifier: `${currentBook.title}|${currentBook.author}`,
                    entryType: metadata.type,
                    content: content || '',
                    location: metadata.location,
                    timestamp: metadata.timestamp,
                    parseIndex: startIndex + i,
                    book: currentBook,
                    metadata
                });
            }
        } catch (error) {
            errors.push(`Entry ${startIndex + i}: Parse error - ${error.message}`);
        }
    }

    return { results, errors, warnings };
}

// Worker message handler
self.onmessage = function (e) {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'PARSE_BATCH':
                const { entries, batchId, options } = data;
                const parseResult = parseEntryBatch(entries, batchId, options);

                self.postMessage({
                    type: 'BATCH_COMPLETE',
                    batchId,
                    data: parseResult,
                    success: true
                });
                break;

            case 'PARSE_FINAL':
                const { entries: finalEntries, batchId: finalBatchId, options: finalOptions } = data;
                const finalResult = parseEntryBatch(finalEntries, finalBatchId, finalOptions);

                self.postMessage({
                    type: 'FINAL_COMPLETE',
                    batchId: finalBatchId,
                    data: finalResult,
                    success: true
                });
                break;

            default:
                self.postMessage({
                    type: 'ERROR',
                    error: `Unknown message type: ${type}`,
                    success: false
                });
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message,
            success: false
        });
    }
};