import { test, expect } from '@playwright/test';

test.describe('NL Weather Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for weather data to load
    await page.waitForSelector('.card', { timeout: 15_000 });
  });

  test('page loads and shows a location name', async ({ page }) => {
    // Should show either Amsterdam (default) or a saved location
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    const text = await header.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });

  test('chart card is visible with model legend', async ({ page }) => {
    // The chart section title should be visible
    await expect(page.getByRole('heading', { name: 'Temperatuur' })).toBeVisible();
    // Model legend should show at least one model
    await expect(page.getByText('🇳🇱 KNMI')).toBeVisible();
  });

  test('variable tabs switch chart content', async ({ page }) => {
    // Click on Wind tab
    const windTab = page.locator('.tab', { hasText: 'Wind' });
    await windTab.click();
    // Section title should now show Wind
    await expect(page.locator('.section-title', { hasText: 'Wind' })).toBeVisible();
  });

  test('time range tabs change chart data', async ({ page }) => {
    // Click 24u tab
    const tab24 = page.locator('.tab', { hasText: '24u' });
    await tab24.click();
    // Tab should become active
    await expect(tab24).toHaveClass(/tab-active/);
  });

  test('location picker opens on click', async ({ page }) => {
    // Find and click the location picker button
    const picker = page.locator('button', { hasText: /Kies locatie|Amsterdam|Haarlem/ }).first();
    await picker.click();
    // Search input should appear
    await expect(page.getByPlaceholder('Zoek locatie...')).toBeVisible();
  });

  test('7-day forecast shows day abbreviations', async ({ page }) => {
    await expect(page.getByText('7-daagse voorspelling')).toBeVisible();
    // Should have at least some day abbreviations
    const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    let found = 0;
    for (const label of dayLabels) {
      const count = await page.getByText(label, { exact: true }).count();
      if (count > 0) found++;
    }
    expect(found).toBeGreaterThanOrEqual(4);
  });

  test('current weather card shows temperature', async ({ page }) => {
    // The large temperature display should be visible (ends with °)
    const tempDisplay = page.locator('text=/\\d+°/').first();
    await expect(tempDisplay).toBeVisible();
  });
});
