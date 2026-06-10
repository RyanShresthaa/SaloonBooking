# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> home loads with salon branding
- Location: e2e\smoke.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /salonapp/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: /salonapp/i })

```

```yaml
- text: Upgrade Required
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('home loads with salon branding', async ({ page }) => {
  4  |   await page.goto('/');
> 5  |   await expect(page.getByRole('link', { name: /salonapp/i })).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  6  | });
  7  | 
  8  | test('login page is reachable for unauthenticated flows', async ({ page }) => {
  9  |   await page.goto('/login');
  10 |   await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  11 | });
  12 | 
```