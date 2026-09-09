import type { IconDefinition, IconGlyph, IconResolver, IconVariant } from './types.js';
import { copySvgNodes, isSafePaint } from './svg-tree.js';

const icons = new Map<string, IconDefinition>();
const listeners = new Set<(name?: string) => void>();
let resolver: IconResolver | undefined;
let generation = 0;
const pending = new Map<string, Promise<IconDefinition | undefined>>();

/** Accept upstream underscore names as well as the canonical kebab-case names. */
export function normalizeIconName(name: string): string {
  return name.trim().toLowerCase().replaceAll('_', '-');
}

export function registerIcons(...definitions: IconDefinition[]): void {
  // Validate the whole batch before changing shared state.
  const validated = definitions.map((definition) => {
    const name = normalizeIconName(definition.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !definition.glyphs.length) {
      throw new TypeError(`Invalid icon definition: ${definition.name}`);
    }
    const keys = new Set<string>();
    const glyphs = definition.glyphs.map((glyph) => {
      const key = `${glyph.variant}:${glyph.size}`;
      if (!Number.isFinite(glyph.size) || glyph.size <= 0 ||
          !['regular', 'filled', 'color'].includes(glyph.variant) || !(glyph.paths.length || glyph.nodes?.length) || keys.has(key)) {
        throw new TypeError(`Invalid or duplicate glyph: ${name} ${key}`);
      }
      keys.add(key);
      if (glyph.fill !== undefined && !isSafePaint(glyph.fill)) throw new TypeError(`Invalid SVG fill: ${name}`);
      if (glyph.viewBox && (glyph.viewBox.length !== 4 || !glyph.viewBox.every(Number.isFinite) || glyph.viewBox[2] <= 0 || glyph.viewBox[3] <= 0)) {
        throw new TypeError(`Invalid viewBox: ${name}`);
      }
      const paths = glyph.paths.map((path) => {
        if (typeof path.d !== 'string' || !path.d.trim() ||
            (path.fill !== undefined && !isSafePaint(path.fill)) ||
            (path.stroke !== undefined && !isSafePaint(path.stroke)) ||
            (path.fillRule !== undefined && !['nonzero', 'evenodd'].includes(path.fillRule)) ||
            (path.clipRule !== undefined && !['nonzero', 'evenodd'].includes(path.clipRule)) ||
            (path.opacity !== undefined && (!Number.isFinite(path.opacity) || path.opacity < 0 || path.opacity > 1))) {
          throw new TypeError(`Invalid SVG path: ${name}`);
        }
        return Object.freeze({ d: path.d, fillRule: path.fillRule, clipRule: path.clipRule, opacity: path.opacity, fill: path.fill, stroke: path.stroke });
      });
      return Object.freeze({ size: glyph.size, viewBox: glyph.viewBox ? Object.freeze([...glyph.viewBox]) as readonly [number, number, number, number] : undefined, variant: glyph.variant, paths: Object.freeze(paths), ...(glyph.nodes ? { nodes: copySvgNodes(glyph.nodes) } : {}), ...(glyph.fill !== undefined ? { fill: glyph.fill } : {}) });
    });
    return Object.freeze({ name, glyphs: Object.freeze(glyphs) });
  });
  for (const definition of validated) icons.set(definition.name, definition);
  for (const definition of validated) for (const listener of listeners) listener(definition.name);
}

export function getIcon(name: string): IconDefinition | undefined {
  return icons.get(normalizeIconName(name));
}

/** Prefer the requested style, then the nearest size (larger wins ties). */
export function selectGlyph(definition: IconDefinition, size = 24, variant: IconVariant = 'regular'): IconGlyph | undefined {
  const target = Number.isFinite(size) && size > 0 ? size : 24;
  const fallback = [variant, 'regular', 'filled', 'color'].find((style) => definition.glyphs.some((glyph) => glyph.variant === style));
  const candidates = definition.glyphs.filter((glyph) => glyph.variant === fallback);
  return candidates.reduce<IconGlyph | undefined>((best, glyph) => {
    if (!best) return glyph;
    const distance = Math.abs(glyph.size - target);
    const bestDistance = Math.abs(best.size - target);
    return distance < bestDistance || (distance === bestDistance && glyph.size > best.size) ? glyph : best;
  }, undefined);
}

/** Replace the optional loader; already registered definitions remain available. */
export function setIconResolver(next?: IconResolver): void {
  resolver = next;
  generation++;
  pending.clear();
  for (const listener of listeners) listener();
}

/** Load and cache a family once. Failed requests are retryable. */
export async function loadIcon(input: string): Promise<IconDefinition | undefined> {
  const name = normalizeIconName(input);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return undefined;
  if (icons.has(name)) return icons.get(name);
  if (!resolver) return undefined;
  if (pending.has(name)) return pending.get(name);
  const currentResolver = resolver;
  const currentGeneration = generation;
  const request = Promise.resolve().then(() => currentResolver(name)).then((definition) => {
    if (currentGeneration !== generation) return getIcon(name);
    // An explicit registration during a request takes precedence.
    if (icons.has(name)) return icons.get(name);
    if (definition) {
      if (normalizeIconName(definition.name) !== name) throw new TypeError(`Resolver returned a different icon for ${name}`);
      registerIcons(definition);
    }
    return getIcon(name);
  }).finally(() => {
    if (pending.get(name) === request) pending.delete(name);
  });
  pending.set(name, request);
  return request;
}

/** @internal */
export function subscribe(listener: (name?: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
