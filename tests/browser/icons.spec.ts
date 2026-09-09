import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/test.html'); });

test('per-icon imports render without downloading the catalog', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const result = await page.evaluate(async () => {
    const entry = '/dist/index.js', family = '/dist/generated/icons/home.js';
    const { defineFluentIcon, registerIcons } = await import(entry);
    const { default: home } = await import(family);
    registerIcons(home); defineFluentIcon();
    const icon = document.createElement('fluent-icon');
    icon.name = 'home'; icon.size = 24;
    document.body.append(icon);
    await icon.updateComplete;
    return { paths: icon.shadowRoot!.querySelectorAll('path').length, viewBox: icon.shadowRoot!.querySelector('svg')?.getAttribute('viewBox') };
  });
  expect(result.paths).toBeGreaterThan(0);
  expect(result.viewBox).toBe('0 0 24 24');
  expect(requests.some((url) => /loaders|catalog/.test(url))).toBe(false);
});

test('lazy loading deduplicates modules and updateComplete includes loading', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const count = await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    const icons = Array.from({ length: 8 }, () => {
      const icon = document.createElement('fluent-icon'); icon.name = 'home'; document.body.append(icon); return icon;
    });
    await Promise.all(icons.map((icon) => icon.updateComplete));
    return icons.filter((icon) => icon.shadowRoot!.querySelector('path')).length;
  });
  expect(count).toBe(8);
  expect(requests.filter((url) => url.endsWith('/icons/home.js'))).toHaveLength(1);
  expect(requests.some((url) => url.endsWith('/icons/mail.js'))).toBe(false);
});

test('shows a skeleton while a family is requested and skips it when cached', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { defineFluentIcon, registerIcons } = await import('/dist/index.js');
    await import('/dist/auto.js');
    const lazy = document.createElement('fluent-icon');
    lazy.name = 'home';
    document.body.append(lazy);
    await Promise.resolve();
    const loading = !!lazy.shadowRoot!.querySelector('[part="skeleton"]');
    await lazy.updateComplete;
    const after = !!lazy.shadowRoot!.querySelector('[part="skeleton"]');
    const cached = document.createElement('fluent-icon');
    cached.name = 'home';
    document.body.append(cached);
    await Promise.resolve();
    const skipped = !cached.shadowRoot!.querySelector('[part="skeleton"]');
    await cached.updateComplete;
    registerIcons({ name: 'unit-cached', glyphs: [{ size: 24, variant: 'regular', paths: [{ d: 'M0 0h24v24H0z' }] }] });
    defineFluentIcon();
    const registered = document.createElement('fluent-icon');
    registered.name = 'unit-cached';
    document.body.append(registered);
    await Promise.resolve();
    const registeredSkip = !registered.shadowRoot!.querySelector('[part="skeleton"]');
    await registered.updateComplete;
    return { loading, after, skipped, registeredSkip, paths: lazy.shadowRoot!.querySelectorAll('path').length };
  });
  expect(result.loading).toBe(true);
  expect(result.after).toBe(false);
  expect(result.skipped).toBe(true);
  expect(result.registeredSkip).toBe(true);
  expect(result.paths).toBeGreaterThan(0);
});

test('decorative icons stay hidden and labels expose an accessible image', async ({ page }) => {
  await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    document.body.innerHTML = '<fluent-icon id="decorative" name="home"></fluent-icon><fluent-icon id="meaningful" name="mail" label="Inbox"></fluent-icon>';
    await Promise.all([...document.querySelectorAll('fluent-icon')].map((icon) => icon.updateComplete));
  });
  await expect(page.locator('#decorative svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('img', { name: 'Inbox' })).toHaveCount(1);
  await page.locator('#meaningful').evaluate((icon) => { icon.setAttribute('label', 'Unread messages'); });
  await expect(page.getByRole('img', { name: 'Unread messages' })).toHaveCount(1);
  await page.locator('#meaningful').evaluate((icon) => { icon.removeAttribute('label'); });
  await expect(page.getByRole('img')).toHaveCount(0);
});

test('properties reflect, styles inherit, and size resets to the surrounding font', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    document.body.style.cssText = 'font-size:32px;color:rgb(180, 20, 80)';
    const icon = document.createElement('fluent-icon'); icon.name = 'home'; document.body.append(icon);
    await icon.updateComplete;
    const inherited = icon.getBoundingClientRect().width;
    const fill = getComputedStyle(icon.shadowRoot!.querySelector('svg')!).fill;
    icon.size = 48; icon.variant = 'filled'; await icon.updateComplete;
    const explicit = icon.getBoundingClientRect().width;
    const variant = icon.getAttribute('variant');
    icon.style.setProperty('--fluent-icon-size', '60px');
    const override = icon.getBoundingClientRect().width;
    icon.style.removeProperty('--fluent-icon-size'); icon.size = undefined; await icon.updateComplete;
    const reset = icon.getBoundingClientRect().width;
    icon.setAttribute('size', '-5'); await icon.updateComplete;
    return { inherited, fill, explicit, variant, override, reset, invalid: icon.getBoundingClientRect().width };
  });
  expect(result).toEqual({ inherited: 32, fill: 'rgb(180, 20, 80)', explicit: 48, variant: 'filled', override: 60, reset: 32, invalid: 32 });
});

test('uses the actual source viewBox and emits selected design details', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    const icon = document.createElement('fluent-icon'); icon.name = 'comment-edit'; icon.variant = 'filled'; icon.size = 16;
    let detail: unknown;
    icon.addEventListener('icon-load', (event) => { detail = event.detail; });
    document.body.append(icon); await icon.updateComplete;
    const familyPath = '/dist/generated/icons/comment-edit.js'; const { default: source } = await import(familyPath);
    const glyph = source.glyphs.find((glyph: { size: number; variant: string }) => glyph.size === 16 && glyph.variant === 'filled');
    return { actual: icon.shadowRoot!.querySelector('svg')!.getAttribute('viewBox'), expected: glyph.viewBox?.join(' ') ?? '0 0 16 16', detail };
  });
  expect(result.actual).toBe(result.expected);
  expect(result.detail).toEqual({ name: 'comment-edit', variant: 'filled', size: 16 });
});

test('late registration, empty names, and error events work without stale artwork', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/index.js'; const api = await import(entry); api.defineFluentIcon();
    const icon = document.createElement('fluent-icon'); icon.name = 'late';
    let errors = 0; let composed = false;
    document.body.addEventListener('icon-error', (event) => { errors++; composed = event.composed; });
    document.body.append(icon); await icon.updateComplete;
    api.registerIcons({ name: 'late', glyphs: [{ size: 24, variant: 'regular', paths: [{ d: 'M0 0h24v24H0z' }] }] });
    await icon.updateComplete;
    const loaded = !!icon.shadowRoot!.querySelector('svg');
    icon.name = ''; await icon.updateComplete;
    return { loaded, cleared: !icon.shadowRoot!.querySelector('svg'), errors, composed };
  });
  expect(result).toEqual({ loaded: true, cleared: true, errors: 1, composed: true });
});

test('rapid name changes cannot display an older async result', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/index.js'; const api = await import(entry); api.defineFluentIcon();
    let resolveSlow!: (value: unknown) => void;
    const definition = (name: string) => ({ name, glyphs: [{ size: name === 'slow' ? 20 : 24, variant: 'regular', paths: [{ d: 'M0 0z' }] }] });
    api.setIconResolver((name: string) => name === 'slow' ? new Promise((resolve) => { resolveSlow = resolve; }) : definition(name));
    const icon = document.createElement('fluent-icon'); icon.name = 'slow'; document.body.append(icon);
    await new Promise((resolve) => setTimeout(resolve, 0));
    icon.name = 'fast'; await icon.updateComplete;
    resolveSlow(definition('slow'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    return icon.shadowRoot!.querySelector('svg')?.getAttribute('viewBox');
  });
  expect(result).toBe('0 0 24 24');
});

test('reconnects cleanly and mirrors only when requested under RTL', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/auto.js'; await import(entry);
    const container = document.createElement('div'); container.dir = 'rtl'; document.body.append(container);
    const icon = document.createElement('fluent-icon'); icon.name = 'arrow-left'; container.append(icon); await icon.updateComplete;
    const normal = getComputedStyle(icon.shadowRoot!.querySelector('svg')!).transform;
    icon.flipRtl = true;
    const flipped = getComputedStyle(icon.shadowRoot!.querySelector('svg')!).transform;
    icon.remove(); container.append(icon); await icon.updateComplete;
    return { normal, flipped, count: icon.shadowRoot!.querySelectorAll('svg').length };
  });
  expect(result).toEqual({ normal: 'none', flipped: 'matrix(-1, 0, 0, 1, 0, 0)', count: 1 });
});

test('supports pre-upgrade properties and repeatable custom tag registration', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const icon = document.createElement('fluent-icon');
    icon.name = 'home'; icon.size = 28;
    document.body.append(icon);
    const entry = '/dist/auto.js'; const api = await import(entry);
    api.defineFluentIcon(); api.defineFluentIcon('my-fluent-icon'); api.defineFluentIcon('my-fluent-icon');
    await icon.updateComplete;
    const other = document.createElement('my-fluent-icon'); other.setAttribute('name', 'home'); document.body.append(other);
    return { name: icon.getAttribute('name'), size: icon.getAttribute('size'), rendered: !!icon.shadowRoot!.querySelector('path'), custom: !!customElements.get('my-fluent-icon') };
  });
  expect(result).toEqual({ name: 'home', size: '28', rendered: true, custom: true });
});

test('failed component loads emit errors and can be retried with refresh', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const entry = '/dist/index.js'; const api = await import(entry); api.defineFluentIcon();
    let attempts = 0; let errors = 0;
    api.setIconResolver((name: string) => {
      if (++attempts === 1) throw new Error('offline');
      return { name, glyphs: [{ size: 24, variant: 'regular', paths: [{ d: 'M0 0z' }] }] };
    });
    const icon = document.createElement('fluent-icon'); icon.name = 'retry'; icon.addEventListener('icon-error', () => { errors++; }); document.body.append(icon);
    await icon.updateComplete; await icon.refresh();
    return { attempts, errors, rendered: !!icon.shadowRoot!.querySelector('svg') };
  });
  expect(result).toEqual({ attempts: 2, errors: 1, rendered: true });
});
