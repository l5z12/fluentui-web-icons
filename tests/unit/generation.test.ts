import { expect, test } from 'bun:test';
import { parseSvg } from '../../scripts/svg.js';
import { iconCatalog, glyphCount, upstreamVersion } from '../../src/generated/catalog.js';
import { iconLoaders } from '../../src/generated/loaders.js';
import { readdir } from 'node:fs/promises';

test('catalog covers every supported upstream SVG and every family has a loader', async () => {
  const files = await readdir('node_modules/@fluentui/svg-icons/icons');
  const pkg = await Bun.file('package.json').json();
  expect(pkg.version).toBe(upstreamVersion);
  expect(pkg.devDependencies['@fluentui/svg-icons']).toBe(upstreamVersion);
  expect(glyphCount).toBe(files.filter((file) => /_(regular|filled|color)\.svg$/.test(file)).length);
  expect(Object.keys(iconLoaders)).toEqual(iconCatalog.map((icon) => icon.name));
  expect(new Set(iconCatalog.map((icon) => icon.exportName)).size).toBe(iconCatalog.length);
  expect(iconCatalog.length).toBeGreaterThan(2900);
});

test('preserves irregular view boxes, colors, opacity, and equivalent viewport clipping', () => {
  const unusual = parseSvg('<svg viewBox="0 0 20 20"><path opacity=".4" fill="#e62c46" d="M0 0h20v20H0z"/></svg>', 16, 'filled', 'test.svg');
  expect(unusual.viewBox).toEqual([0, 0, 20, 20]);
  expect(unusual.paths[0]?.fill).toBe('#e62c46');
  expect(unusual.paths[0]?.opacity).toBe(.4);
  const clipped = parseSvg('<svg viewBox="0 0 12 12"><g clip-path="url(#a)"><path d="M0 0z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h12v12H0z"/></clipPath></defs></svg>', 12, 'regular', 'test.svg');
  expect(clipped.paths).toEqual([{ d: 'M0 0z' }]);
});

test('rejects unsafe or unsupported SVGs instead of silently losing geometry', () => {
  expect(() => parseSvg('<svg viewBox="0 0 24 24" transform="scale(2)"><path d="M0 0z"/></svg>', 24, 'regular', 'bad.svg')).toThrow();
  for (const body of ['<script>alert(1)</script>', '<image href="https://example.com"/>', '<path onload="alert(1)" d="M0 0z"/>', '<path fill="url(https://example.com)" d="M0 0z"/>', '<circle r="5"/>']) {
    expect(() => parseSvg(`<svg viewBox="0 0 24 24">${body}</svg>`, 24, 'regular', 'bad.svg')).toThrow();
  }
});

test('public entry points import safely without browser globals', async () => {
  const api = await import('../../src/index.js');
  expect(api.defineFluentIcon()).toBeUndefined();
  await import('../../src/auto.js');
});
