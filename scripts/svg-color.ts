import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import type { IconGlyph, IconSvgNode, IconSvgTag } from '../src/types.js';
import { copySvgNodes, isSafePaint } from '../src/svg-tree.js';

export function parseColorSvg(source: string, size: number, filename: string): IconGlyph {
  const fail = (message: string): never => { throw new Error(`${filename}: ${message}`); };
  // External entities, DTDs, and processing instructions are not artwork.
  if (/<!|<\?/.test(source)) fail('Unsupported XML declaration');
  const document = new DOMParser({ onError: (_level, message) => fail(message) }).parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (!root || root.tagName !== 'svg') return fail('Expected an SVG root');
  for (let index = 0; index < root.attributes.length; index++) {
    const attribute = root.attributes.item(index)!;
    if (!['xmlns', 'width', 'height', 'viewBox', 'fill'].includes(attribute.name)) fail(`Unsupported SVG root attribute: ${attribute.name}`);
    if (attribute.name === 'xmlns' && attribute.value !== 'http://www.w3.org/2000/svg') fail('Unexpected SVG namespace');
  }
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2]! <= 0 || viewBox[3]! <= 0) return fail('Invalid viewBox');
  const fill = root.getAttribute('fill') ?? undefined;
  if (fill !== undefined && !isSafePaint(fill)) fail('Unsupported SVG root fill');
  function children(parent: Element): IconSvgNode[] {
    const result: IconSvgNode[] = [];
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && !child.textContent?.trim()) continue;
      if (child.nodeType !== 1) fail('Unsupported SVG content');
      const element = child as Element;
      const attributes: Record<string, string> = {};
      for (let index = 0; index < element.attributes.length; index++) {
        const attribute = element.attributes.item(index)!;
        attributes[attribute.name] = attribute.value;
      }
      const nested = children(element);
      result.push({ tag: element.tagName as IconSvgTag, attributes, ...(nested.length ? { children: nested } : {}) });
    }
    return result;
  }
  const nodes = copySvgNodes(children(root));
  if (!nodes.length) return fail('Empty SVG');
  return { size, variant: 'color', paths: [], nodes, ...(fill !== undefined ? { fill } : {}), ...(viewBox.join(' ') === `0 0 ${size} ${size}` ? {} : { viewBox: viewBox as [number, number, number, number] }) };
}
