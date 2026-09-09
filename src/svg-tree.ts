import type { IconSvgNode } from './types.js';

const attributesByTag: Record<string, readonly string[]> = {
  path: ['d', 'fill', 'stroke', 'fill-opacity', 'fill-rule', 'clip-rule', 'opacity'],
  g: ['filter', 'clip-path', 'fill', 'opacity'],
  defs: [],
  linearGradient: ['id', 'x1', 'x2', 'y1', 'y2', 'gradientUnits'],
  radialGradient: ['id', 'cx', 'cy', 'r', 'gradientTransform', 'gradientUnits'],
  stop: ['stop-color', 'offset', 'stop-opacity'],
  rect: ['width', 'height', 'x', 'y', 'rx', 'ry', 'fill', 'fill-opacity'],
  circle: ['cx', 'cy', 'r', 'fill', 'fill-opacity'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'fill-opacity'],
  clipPath: ['id'],
  filter: ['id', 'width', 'height', 'x', 'y', 'color-interpolation-filters', 'filterUnits'],
  feFlood: ['flood-opacity', 'flood-color', 'result'],
  feColorMatrix: ['in', 'result', 'values', 'type'],
  feOffset: ['dx', 'dy', 'in', 'result'],
  feGaussianBlur: ['stdDeviation', 'in', 'result'],
  feBlend: ['in', 'in2', 'result', 'mode'],
};

export function isSafePaint(value: string): boolean {
  return /^(?:#[a-fA-F0-9]{3}|#[a-fA-F0-9]{6}|none|currentColor|red|black|white|transparent)$/.test(value);
}

const referencePattern = /^url\(#([\w-]+)\)$/;

/** Validate and defensively copy a complete SVG tree, including local references. */
export function copySvgNodes(nodes: readonly IconSvgNode[]): readonly IconSvgNode[] {
  const ids = new Set<string>();
  const references = new Set<string>();
  const copy = (node: IconSvgNode, depth: number): IconSvgNode => {
    if (depth > 32 || !Object.hasOwn(attributesByTag, node.tag)) throw new TypeError(`Unsupported SVG element: ${node.tag}`);
    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(node.attributes)) {
      if (!attributesByTag[node.tag]!.includes(key) || typeof value !== 'string') throw new TypeError(`Unsupported SVG attribute: ${node.tag}.${key}`);
      let valid = false;
      if (['fill', 'stroke', 'filter', 'clip-path'].includes(key)) {
        const reference = value.match(referencePattern);
        valid = !!reference || isSafePaint(value);
        if (reference) references.add(reference[1]!);
      } else if (['stop-color', 'flood-color'].includes(key)) valid = isSafePaint(value);
      else if (key === 'id') {
        valid = /^[\w-]+$/.test(value) && !ids.has(value);
        ids.add(value);
      } else if (['in', 'in2', 'result'].includes(key)) valid = /^[\w-]+$/.test(value);
      else if (key === 'd') valid = !!value && /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/.test(value);
      else if (key === 'gradientTransform') valid = /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([0-9eE.,+\s-]+\)\s*)+$/.test(value);
      else if (['gradientUnits', 'filterUnits'].includes(key)) valid = ['userSpaceOnUse', 'objectBoundingBox'].includes(value);
      else if (key === 'color-interpolation-filters') valid = ['sRGB', 'linearRGB'].includes(value);
      else if (['fill-rule', 'clip-rule'].includes(key)) valid = ['nonzero', 'evenodd'].includes(value);
      else if (key === 'type') valid = ['matrix', 'saturate', 'hueRotate', 'luminanceToAlpha'].includes(value);
      else if (key === 'mode') valid = ['normal', 'multiply', 'screen', 'darken', 'lighten'].includes(value);
      else valid = !!value.trim() && /^[0-9eE.,+\s%-]+$/.test(value);
      if (!valid) throw new TypeError(`Invalid SVG attribute: ${key}=${value}`);
      attributes[key] = value;
    }
    return Object.freeze({ tag: node.tag, attributes: Object.freeze(attributes), ...(node.children?.length ? { children: Object.freeze(node.children.map((child) => copy(child, depth + 1))) } : {}) });
  };
  const result = nodes.map((node) => copy(node, 0));
  for (const reference of references) if (!ids.has(reference)) throw new TypeError(`Unresolved SVG reference: ${reference}`);
  return Object.freeze(result);
}

/** Build with DOM APIs; namespace IDs so multiple copies never share paint servers. */
export function appendSvgNodes(parent: SVGElement, nodes: readonly IconSvgNode[], prefix: string): void {
  for (const node of nodes) {
    const element = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', node.tag);
    for (const [key, value] of Object.entries(node.attributes)) {
      element.setAttribute(key, key === 'id' ? prefix + value : value.replace(referencePattern, `url(#${prefix}$1)`));
    }
    if (node.children) appendSvgNodes(element, node.children, prefix);
    parent.append(element);
  }
}
