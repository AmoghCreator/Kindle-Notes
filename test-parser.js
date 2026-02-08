import { TextFileParserService } from '../src/lib/parsers/text-file-parser-service.js';
import { DeduplicationService } from '../src/lib/storage/deduplication.js';
import { ImportSessionService } from '../src/lib/storage/import-session-service.js';

// Test sample data
const sampleKindleText = `The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 180 | location 2740-2741 | Added on Monday, January 1, 2024 10:30:00 AM

So we beat on, boats against the current, borne back ceaselessly into the past.

The Great Gatsby (F. Scott Fitzgerald)  
- Your Note on page 95 | location 1456 | Added on Monday, January 1, 2024 11:45:00 AM

This is a personal note I wrote about this passage.

1984 (George Orwell)
- Your Highlight on page 1 | location 15-16 | Added on Tuesday, January 2, 2024 9:00:00 AM

It was a bright cold day in April, and the clocks were striking thirteen.`;

async function testParser() {
    try {
        console.log('Starting parser test...');

        // Create mock services
        const deduplicationService = new DeduplicationService();
        const importSessionService = new ImportSessionService();

        // Initialize parser service
        const parserService = new TextFileParserService(
            deduplicationService,
            importSessionService,
            { strictMode: false }
        );

        console.log('Services initialized');

        // Create a mock file for testing
        const mockFile = {
            name: 'test-clippings.txt',
            size: sampleKindleText.length,
            type: 'text/plain'
        };

        console.log('Starting parse operation...');

        // Test the parsing
        const result = await parserService.parseTextFile(
            mockFile,
            sampleKindleText,
            {
                onProgress: (progress) => {
                    console.log(`Progress: ${progress.overallProgress.toFixed(1)}% - ${progress.stage}`);
                }
            }
        );

        console.log('Parse completed successfully!');
        console.log('Results:', {
            totalEntries: result.statistics.totalEntries,
            errors: result.errors.length,
            warnings: result.warnings.length
        });

        if (result.entries.length > 0) {
            console.log('First entry:', result.entries[0]);
        }

        if (result.errors.length > 0) {
            console.log('Errors:', result.errors);
        }

        return result;

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Run test
testParser().then(result => {
    console.log('Test completed successfully');
}).catch(error => {
    console.error('Test failed:', error.message);
});