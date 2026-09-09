import { expect, test } from '@playwright/test';

// Playwright 1.63's role locator does not read ElementInternals defaults.
// Fluent buttons expose their role through ElementInternals (verified in the browser AX tree).
const button = (page: import('@playwright/test').Page, text: string) => page.locator('fluent-button').filter({ hasText: text });

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
});

test('explorer searches, selects, switches styles, and handles empty results', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.icon-card')).toHaveCount(72);
  await button(page, 'Regular').click();
  await page.getByRole('textbox', { name: 'Search icons' }).fill('arrow left');
  await expect(page.locator('.icon-card')).not.toHaveCount(72);
  await page.locator('.icon-card[aria-label="arrow-left"]').click();
  await expect(page.locator('#selected-name')).toHaveText('arrow-left');
  await button(page, 'Filled').click();
  await expect(page.locator('#preview')).toHaveAttribute('variant', 'filled');
  await expect(page.locator('#markup')).toContainText('variant="filled"');
  await page.getByRole('textbox', { name: 'Search icons' }).fill('no-such-icon-12345');
  await expect(page.getByRole('heading', { name: 'No icons found' })).toBeVisible();
  await button(page, 'Clear search').click();
  await expect(page.locator('.icon-card')).toHaveCount(72);
  expect(errors).toEqual([]);
});

test('follows the system color scheme until the toggle is used', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('fluent-button[aria-label="Switch to dark theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('guide, pagination, theme and keyboard search work', async ({ page }) => {
  await page.goto('/');
  await button(page, 'Next →').click();
  await expect(page.locator('#page-count')).toContainText('Page 2');
  await button(page, 'Get started').click();
  await expect(page.getByRole('heading', { name: 'A small API. A quick start.' })).toBeVisible();
  await page.locator('fluent-button[aria-label="Switch to dark theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('/');
  await expect(page.getByRole('textbox', { name: 'Search icons' })).toBeFocused();
});

test('uses registered Fluent controls and color artwork, including size and theme changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#preview linearGradient')).not.toHaveCount(0);
  await expect(page.locator('#preview svg')).toHaveAttribute('aria-hidden', 'true');
  await page.getByRole('textbox', { name: 'Accessible label' }).fill('Inbox');
  await expect(page.locator('#preview svg')).toHaveAttribute('aria-label', 'Inbox');
  await expect(page.locator('#markup')).toContainText('label="Inbox"');
  await page.getByRole('textbox', { name: 'Accessible label' }).fill('');
  await expect(page.locator('#preview svg')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => ['fluent-button', 'fluent-text-input', 'fluent-dropdown', 'fluent-listbox', 'fluent-option', 'fluent-field', 'fluent-label', 'fluent-badge'].every((name) => !!customElements.get(name)))).toBe(true);
  await expect(page.locator('#original-palette')).toBeVisible();
  await expect(page.locator('#tint-field')).toBeHidden();
  await page.getByRole('combobox', { name: 'Icon size' }).click();
  await page.locator('fluent-option[value="48"]').click();
  await expect(page.locator('#markup')).toContainText('size="48"');
  const light = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--colorNeutralBackground1'));
  await page.locator('fluent-button[aria-label="Switch to dark theme"]').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--colorNeutralBackground1'))).not.toBe(light);
  await button(page, 'Regular').click();
  await expect(page.locator('#tint-field')).toBeVisible();
  await page.getByRole('textbox', { name: 'Icon color', exact: true }).fill('#c02070');
  await expect(page.locator('#preview')).toHaveCSS('color', 'rgb(192, 32, 112)');
  await expect(page.locator('#markup')).toContainText('style="color: #c02070"');
  await button(page, 'Color').click();
  await expect(page.locator('#markup')).toContainText('variant="color"');
  await expect(page.locator('#markup')).not.toContainText('style=');
});

test('fits a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#preview svg')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(button(page, 'Copy import code')).toBeVisible();
});
