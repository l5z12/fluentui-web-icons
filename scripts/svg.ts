import type { IconGlyph, IconPath, IconVariant } from '../src/types.js';
import { isSafePaint } from '../src/svg-tree.js';
import { parseColorSvg } from './svg-color.js';

/** Intentionally strict: upstream format changes fail the build for review. */
export function parseSvg(svg: string, size: number, variant: IconVariant, filename: string): IconGlyph {
  if (variant === 'color') return parseColorSvg(svg, size, filename);
  const fail = (message: string): never => { throw new Error(`${filename}: ${message}`); };
  const root = svg.trim().match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/);
  if (!root) return fail('Expected one SVG root');
  const rootKeys = new Set<string>();
  const rootRemainder = root[1]!.replace(/([\w:-]+)="([^"]*)"/g, (_, key: string, value: string) => {
    if (rootKeys.has(key) || !['xmlns', 'width', 'height', 'viewBox'].includes(key)) fail(`Unsupported or duplicate SVG root attribute: ${key}`);
    rootKeys.add(key);
    if (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg') fail('Unexpected SVG namespace');
    if ((key === 'width' || key === 'height') && (!Number.isFinite(Number(value)) || Number(value) <= 0)) fail('Invalid SVG dimensions');
    return '';
  });
  if (rootRemainder.trim()) return fail('Malformed SVG root attributes');
  const viewBox = root[1]!.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2]! <= 0 || viewBox[3]! <= 0) return fail('Invalid viewBox');
  let body = root[2]!;
  // Five upstream glyphs wrap paths in a clip equal to the SVG viewport.
  // The component's overflow:hidden provides exactly the same clipping.
  if (body.startsWith('<g ')) {
    const clipped = body.match(/^<g clip-path="url\(#([\w-]+)\)">([\s\S]+)<\/g><defs><clipPath id="([\w-]+)"><path fill="#fff" d="([^"]+)"\/><\/clipPath><\/defs>$/);
    if (!clipped || clipped[1] !== clipped[3] || clipped[4] !== `M0 0h${size}v${size}H0z`) return fail('Unsupported clipping geometry');
    body = clipped[2]!;
  }
  const paths: IconPath[] = [];
  const remaining = body.replace(/<path\b([^>]*?)\s*\/>(?:\s*)/g, (_, attributes: string) => {
    const path: { d: string; fillRule?: 'evenodd' | 'nonzero'; clipRule?: 'evenodd' | 'nonzero'; opacity?: number; fill?: string; stroke?: string } = { d: '' };
    const pathKeys = new Set<string>();
    const leftover = attributes.replace(/([\w:-]+)="([^"]*)"/g, (_, key: string, value: string) => {
      if (pathKeys.has(key)) fail(`Duplicate path attribute: ${key}`);
      pathKeys.add(key);
      if (key === 'd') {
        if (!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/.test(value)) fail('Invalid SVG path data');
        path.d = value;
      } else if (key === 'fill-rule' || key === 'clip-rule') {
        if (value !== 'evenodd' && value !== 'nonzero') fail(`Invalid ${key}`);
        path[key === 'fill-rule' ? 'fillRule' : 'clipRule'] = value as 'evenodd' | 'nonzero';
      } else if (key === 'opacity') {
        const opacity = Number(value);
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) fail('Invalid opacity');
        path.opacity = opacity;
      } else if (key === 'fill' || key === 'stroke') {
        if (!isSafePaint(value)) fail(`Unsupported paint: ${value}`);
        path[key] = value;
      } else {
        fail(`Unsupported path attribute: ${key}`);
      }
      return '';
    });
    if (leftover.trim() || !path.d) fail('Malformed path');
    paths.push(path);
    return '';
  });
  if (remaining.trim() || paths.length === 0) return fail('Unsupported SVG content');
  return { size, variant, ...(viewBox.join(' ') === `0 0 ${size} ${size}` ? {} : { viewBox: viewBox as [number, number, number, number] }), paths };
}
