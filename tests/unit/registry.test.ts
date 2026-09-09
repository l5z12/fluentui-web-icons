import { afterEach, describe, expect, test } from 'bun:test';
import { getIcon, loadIcon, normalizeIconName, registerIcons, selectGlyph, setIconResolver } from '../../src/registry.js';
import type { IconDefinition } from '../../src/types.js';

const makeIcon = (name: string): IconDefinition => ({ name, glyphs: [
  { size: 20, variant: 'regular', paths: [{ d: 'M0 0h20v20H0z' }] },
  { size: 28, variant: 'regular', paths: [{ d: 'M0 0h28v28H0z' }] },
  { size: 24, variant: 'filled', paths: [{ d: 'M0 0h24v24H0z' }] },
] });
afterEach(() => setIconResolver());

describe('icon registry', () => {
  test('normalizes upstream names and protects registered data from mutation', () => {
    const icon = makeIcon('UNIT_home');
    registerIcons(icon);
    expect(normalizeIconName(' Arrow_Left ')).toBe('arrow-left');
    expect(getIcon('unit_home')?.name).toBe('unit-home');
    expect(Object.isFrozen(getIcon('unit-home')?.glyphs[0]?.paths[0])).toBe(true);
  });
  test('selects exact, nearest larger tie, requested style, and missing style fallback', () => {
    const icon = makeIcon('sizes');
    expect(selectGlyph(icon, 24, 'regular')?.size).toBe(28);
    expect(selectGlyph(icon, 21, 'regular')?.size).toBe(20);
    expect(selectGlyph(icon, 48, 'filled')?.size).toBe(24);
    expect(selectGlyph({ name: 'single', glyphs: [icon.glyphs[0]!] }, 24, 'filled')?.variant).toBe('regular');
  });
  test('deduplicates concurrent requests and caches results', async () => {
    let calls = 0;
    setIconResolver(async (name) => { calls++; await Bun.sleep(5); return makeIcon(name); });
    const [a, b] = await Promise.all([loadIcon('unit-concurrent'), loadIcon('unit-concurrent')]);
    expect(a).toBe(b);
    expect(await loadIcon('unit-concurrent')).toBe(a);
    expect(calls).toBe(1);
  });
  test('failed loads can be retried', async () => {
    let calls = 0;
    setIconResolver((name) => { if (++calls === 1) throw new Error('offline'); return makeIcon(name); });
    await expect(loadIcon('unit-retry')).rejects.toThrow('offline');
    expect((await loadIcon('unit-retry'))?.name).toBe('unit-retry');
  });
  test('does not cache stale resolver results', async () => {
    let finish!: (value: IconDefinition) => void;
    setIconResolver(() => new Promise((resolve) => { finish = resolve; }));
    const old = loadIcon('unit-stale');
    await Promise.resolve();
    setIconResolver();
    finish(makeIcon('unit-stale'));
    expect(await old).toBeUndefined();
    expect(getIcon('unit-stale')).toBeUndefined();
  });
  test('explicit registration takes precedence over an in-flight loader', async () => {
    let finish!: (value: IconDefinition) => void;
    setIconResolver(() => new Promise((resolve) => { finish = resolve; }));
    const request = loadIcon('unit-override');
    await Promise.resolve();
    registerIcons({ name: 'unit-override', glyphs: [{ size: 48, variant: 'filled', paths: [{ d: 'M0 0z' }] }] });
    finish(makeIcon('unit-override'));
    expect((await request)?.glyphs[0]?.size).toBe(48);
  });
  test('rejects mismatched loader output and invalid names', async () => {
    setIconResolver(() => makeIcon('wrong'));
    await expect(loadIcon('unit-mismatch')).rejects.toThrow('different icon');
    expect(await loadIcon('../home')).toBeUndefined();
    expect(await loadIcon('__proto__')).toBeUndefined();
  });
  test('batch validation is atomic and rejects executable paints', () => {
    const malicious: IconDefinition = { name: 'bad', glyphs: [{ size: 24, variant: 'filled', paths: [{ d: 'M0 0z', fill: 'url(https://example.com)' }] }] };
    expect(() => registerIcons(makeIcon('unit-atomic'), malicious)).toThrow();
    expect(getIcon('unit-atomic')).toBeUndefined();
    expect(() => registerIcons({ name: 'empty', glyphs: [] })).toThrow();
  });
});
