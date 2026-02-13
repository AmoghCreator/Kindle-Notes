import { test, expect } from '@playwright/test';

test.describe('Random suggestion sharing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/library');
    });

    test('shows suggestion card or empty-state message', async ({ page }) => {
        const suggestionHeading = page.getByRole('heading', { name: /random spark/i });
        await expect(suggestionHeading).toBeVisible();

        const suggestionText = page.locator('.suggestion-text');
        const emptyState = page.locator('.suggestion-empty');
        await expect(suggestionText.or(emptyState)).toBeVisible();
    });

    test('copies formatted share text when Web Share API is unavailable', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.addInitScript(() => {
            // Force clipboard fallback path
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined,
            });
        });

        await page.goto('/library');

        const shareButton = page.getByRole('button', { name: /share now/i });
        const emptyState = page.locator('.suggestion-empty');

        if (await emptyState.isVisible()) {
            test.skip(true, 'No suggestion available in current test data');
        }

        await shareButton.click();
        const toast = page.locator('.toast').last();
        await expect(toast).toContainText(/copied|share/i);
    });
});
