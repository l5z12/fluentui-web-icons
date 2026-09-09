import { expect, test } from 'bun:test';
import { parseSvg } from '../../scripts/svg.js';
import { copySvgNodes } from '../../src/svg-tree.js';
import { selectGlyph, registerIcons, getIcon } from '../../src/registry.js';
import type { IconDefinition, IconSvgNode } from '../../src/types.js';

test('color parsing preserves original gradients, filters, and root fill', async () => {
  for (const name of ['mail', 'calendar', 'calendar-edit']) {
    const source = await Bun.file(`node_modules/@fluentui/svg-icons/icons/${name.replaceAll('-', '_')}_24_color.svg`).text();
    const glyph = parseSvg(source, 24, 'color', name);
    expect(glyph.fill).toBe('none');
    expect(glyph.nodes?.length).toBeGreaterThan(0);
    const all = JSON.stringify(glyph.nodes);
    expect(all).toContain('Gradient');
    if (source.includes('<filter')) expect(all).toContain('feGaussianBlur');
    if (source.includes('<clipPath')) expect(all).toContain('clipPath');
    registerIcons({ name: `test-color-${name}`, glyphs: [glyph] });
    expect(Object.isFrozen(getIcon(`test-color-${name}`)?.glyphs[0]?.nodes?.[0]?.attributes)).toBe(true);
  }
});

test('SVG trees reject external resources, active content, duplicate and dangling IDs', () => {
  const unsafe = [
    '<path d="M0 0z" fill="url(https://example.com/icon.svg#a)"/>',
    '<script>alert(1)</script>', '<image href="https://example.com"/>',
    '<path d="M0 0z" onclick="alert(1)"/>',
    '<path d="M0 0z" fill="url(#missing)"/>',
    '<defs><linearGradient id="a"/><linearGradient id="a"/></defs>',
    '<foreignObject><div>HTML</div></foreignObject>',
  ];
  for (const body of unsafe) expect(() => parseSvg(`<svg viewBox="0 0 24 24">${body}</svg>`, 24, 'color', 'bad')).toThrow();
  expect(() => parseSvg('<!DOCTYPE svg [<!ENTITY name SYSTEM "file:///etc/passwd">]><svg viewBox="0 0 24 24">&name;</svg>', 24, 'color', 'bad')).toThrow();
  expect(() => copySvgNodes([{ tag: 'path', attributes: { fill: 'url(javascript:alert(1))' } }] as IconSvgNode[])).toThrow();
});

test('color selects the nearest optical size and missing styles fall back predictably', () => {
  const definition: IconDefinition = { name: 'color-fallback', glyphs: [
    { size: 24, variant: 'color', paths: [{ d: 'M0 0z' }] },
    { size: 20, variant: 'regular', paths: [{ d: 'M0 0z' }] },
    { size: 48, variant: 'color', paths: [{ d: 'M0 0z' }] },
  ] };
  expect(selectGlyph(definition, 40, 'color')?.size).toBe(48);
  expect(selectGlyph(definition, 24, 'filled')?.variant).toBe('regular');
  expect(selectGlyph({ ...definition, glyphs: [definition.glyphs[1]!] }, 24, 'color')?.variant).toBe('regular');
});
