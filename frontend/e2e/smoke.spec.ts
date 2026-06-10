import { test, expect } from '@playwright/test';

test('home loads with salon branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /salonapp/i })).toBeVisible();
});

test('login page is reachable for unauthenticated flows', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});
