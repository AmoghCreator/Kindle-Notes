import { test, expect } from '@playwright/test';

test.describe('File Upload Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display file upload component on homepage', async ({ page }) => {
        // Check if the upload area is visible
        const uploadArea = page.getByTestId('file-upload');
        await expect(uploadArea).toBeVisible();

        // Check for drag and drop text
        await expect(page.getByText(/drag.*drop.*kindle files/i)).toBeVisible();

        // Check for file input button
        const browseButton = page.getByRole('button', { name: /browse files/i });
        await expect(browseButton).toBeVisible();
    });

    test('should accept valid Kindle file upload', async ({ page }) => {
        // Create a mock Kindle export file
        const kindleContent = `
My Clippings.txt

==========
Book Title: Test Book (Author Name)
- Your Highlight on page 1 | location 25 | Added on Monday, January 1, 2024 1:00:00 PM

This is a test highlight from the book.

==========
Book Title: Test Book (Author Name)  
- Your Note on page 2 | location 45 | Added on Monday, January 1, 2024 2:00:00 PM

This is a test note.

==========
`;

        // Upload the file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'My Clippings.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(kindleContent)
        });

        // Check for upload progress
        await expect(page.getByText(/uploading/i)).toBeVisible();

        // Wait for success message
        await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 });

        // Check if redirected to library
        await expect(page).toHaveURL(/\/library/);
    });

    test('should show error for invalid file format', async ({ page }) => {
        // Upload an invalid file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'invalid.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('This is not a text file')
        });

        // Check for error message
        await expect(page.getByText(/invalid file format/i)).toBeVisible();
    });

    test('should handle drag and drop upload', async ({ page }) => {
        const kindleContent = `
My Clippings.txt

==========
Book Title: Test Book (Author Name)
- Your Highlight on page 1 | location 25 | Added on Monday, January 1, 2024 1:00:00 PM

This is a test highlight.
==========
`;

        // Simulate drag and drop
        const uploadArea = page.getByTestId('file-upload');

        // Create a data transfer object
        await page.evaluate((content) => {
            const dt = new DataTransfer();
            const file = new File([content], 'My Clippings.txt', { type: 'text/plain' });
            dt.items.add(file);

            const uploadArea = document.querySelector('[data-testid="file-upload"]');
            const dropEvent = new DragEvent('drop', { dataTransfer: dt });
            uploadArea?.dispatchEvent(dropEvent);
        }, kindleContent);

        // Check for upload processing
        await expect(page.getByText(/processing file/i)).toBeVisible();
    });

    test('should validate file size limits', async ({ page }) => {
        // Create a large file (over 10MB)
        const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'large-file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(largeContent)
        });

        // Check for file size error
        await expect(page.getByText(/file too large/i)).toBeVisible();
    });

    test('should show upload progress for large files', async ({ page }) => {
        // Create a moderately large file
        const mediumContent = 'x'.repeat(2 * 1024 * 1024); // 2MB

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'medium-file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(mediumContent)
        });

        // Check for progress bar
        const progressBar = page.getByRole('progressbar');
        await expect(progressBar).toBeVisible();

        // Progress should start at 0 and increase
        const initialValue = await progressBar.getAttribute('value');
        expect(Number(initialValue)).toBe(0);
    });
});