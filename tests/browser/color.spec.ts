import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.goto('/test.html'); });

test('renders every upstream color design with valid local paint references', async ({ page }) => {
  const expectedCount = (await readdir('node_modules/@fluentui/svg-icons/icons')).filter((name) => name.endsWith('_color.svg')).length;
  const result = await page.evaluate(async () => {
    const entry = '/dist/auto.js', catalogPath = '/dist/generated/catalog.js';
    const api = await import(entry);
    const { iconCatalog } = await import(catalogPath);
    const families = iconCatalog.filter((icon: { variants: string[] }) => icon.variants.includes('color'));
    let errors = 0;
    document.body.addEventListener('icon-error', () => errors++);
    const icons: HTMLElementTagNameMap['fluent-icon'][] = [];
    for (const family of families) {
      const definition = await api.loadIcon(family.name);
      for (const glyph of definition.glyphs.filter((glyph: { variant: string }) => glyph.variant === 'color')) {
        const icon = document.createElement('fluent-icon');
        icon.name = family.name; icon.variant = 'color'; icon.size = glyph.size;
        document.body.append(icon); icons.push(icon);
      }
    }
    await Promise.all(icons.map((icon) => icon.updateComplete));
    let brokenReferences = 0;
    const allIds: string[] = [];
    for (const icon of icons) {
      const svg = icon.shadowRoot!.querySelector('svg');
      if (!svg) { brokenReferences++; continue; }
      for (const element of svg.querySelectorAll('*')) {
        if (element.id) allIds.push(element.id);
        for (const attribute of element.attributes) {
          const match = attribute.value.match(/^url\(#(.+)\)$/);
          if (match && !svg.querySelector(`#${CSS.escape(match[1]!)}`)) brokenReferences++;
        }
      }
    }
    return { count: icons.length, errors, brokenReferences, uniqueIds: new Set(allIds).size === allIds.length };
  });
  expect(result.count).toBe(expectedCount);
  expect(result.errors).toBe(0);
  expect(result.brokenReferences).toBe(0);
  expect(result.uniqueIds).toBe(true);
});

for (const name of ['mail', 'calendar', 'calendar-edit']) {
  test(`${name} color pixels match the original upstream SVG`, async ({ page }, testInfo) => {
    const source = await readFile(`node_modules/@fluentui/svg-icons/icons/${name.replaceAll('-', '_')}_24_color.svg`, 'utf8');
    await page.evaluate(async ({ name, source }) => {
      const entry = '/dist/auto.js'; await import(entry);
      document.body.style.cssText = 'margin:0;background:white';
      const icon = document.createElement('fluent-icon'); icon.name = name; icon.variant = 'color'; icon.size = 96;
      // Register only the 24px artwork to compare the exact same source design.
      const apiPath = '/dist/index.js'; const api = await import(apiPath);
      const definition = await api.loadIcon(name);
      api.registerIcons({ name, glyphs: definition.glyphs.filter((glyph: { size: number; variant: string }) => glyph.size === 24 && glyph.variant === 'color') });
      icon.style.display = 'block'; document.body.append(icon); await icon.updateComplete;
      // Compare to the untouched SVG in the same inline rendering mode. WebKit's
      // SVG-as-image filter rasterization differs from its inline SVG renderer.
      const original = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
      original.id = 'original'; original.setAttribute('width', '96'); original.setAttribute('height', '96');
      original.setAttribute('style', 'display:block');
      document.body.append(document.importNode(original, true));
    }, { name, source });
    const actual = await page.locator('fluent-icon').screenshot();
    const original = await page.locator('#original').screenshot();
    if (!actual.equals(original)) {
      await testInfo.attach('actual', { body: actual, contentType: 'image/png' });
      await testInfo.attach('original', { body: original, contentType: 'image/png' });
    }
    expect(actual.equals(original)).toBe(true);
  });
}

test('hiding one repeated icon does not affect another icon’s gradients', async ({ page }) => {
  await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    document.body.style.background = 'white';
    document.body.innerHTML = '<fluent-icon id="first" name="mail" variant="color" size="48"></fluent-icon><fluent-icon id="second" name="mail" variant="color" size="48"></fluent-icon>';
    await Promise.all([...document.querySelectorAll('fluent-icon')].map((icon) => icon.updateComplete));
  });
  const before = await page.locator('#second').screenshot();
  await page.locator('#first').evaluate((icon) => { (icon as HTMLElement).style.visibility = 'hidden'; });
  expect((await page.locator('#second').screenshot()).equals(before)).toBe(true);
});
