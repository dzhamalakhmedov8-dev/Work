const { test, expect } = require('@playwright/test');

test('homepage has Playwright in the title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Playwright/i);
});

test('Get started link is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
});
