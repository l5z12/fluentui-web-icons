import { getIcon, loadIcon, normalizeIconName, selectGlyph, subscribe } from './registry.js';
import type { IconErrorDetail, IconLoadDetail, IconVariant } from './types.js';
import { appendSvgNodes } from './svg-tree.js';

const svgNamespace = 'http://www.w3.org/2000/svg';
let svgInstance = 0;
// Importing on a server is safe; defining/rendering requires a browser realm.
const BaseElement = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;
const css = `
  :host { display: inline-flex; flex: none; width: var(--fluent-icon-size, var(--_fluent-icon-size, 1em)); height: var(--fluent-icon-size, var(--_fluent-icon-size, 1em)); vertical-align: -0.125em; color: inherit; }
  :host([hidden]) { display: none; }
  svg { display: block; width: 100%; height: 100%; fill: currentColor; overflow: hidden; }
  :host([flip-rtl]:dir(rtl)) svg { transform: scaleX(-1); }
  [part="skeleton"] { display: block; box-sizing: border-box; width: 100%; height: 100%; border-radius: 22%; background: currentColor; opacity: 0.16; pointer-events: none; animation: fluent-icon-skeleton 1.2s ease-in-out infinite; }
  @keyframes fluent-icon-skeleton { 50% { opacity: 0.07; } }
  @media (prefers-reduced-motion: reduce) { [part="skeleton"] { animation: none; } }
`;

/** A decorative-by-default, framework-independent Fluent System Icon. */
export class FluentIcon extends BaseElement {
  static readonly observedAttributes = ['name', 'variant', 'size', 'label', 'aria-label'];
  #unsubscribe?: () => void;
  #revision = 0;
  #queued = false;
  #svg?: SVGSVGElement;
  #skeleton?: HTMLElement;
  #complete: Promise<void> = Promise.resolve();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = this.ownerDocument.createElement('style');
    style.textContent = css;
    root.append(style);
  }

  get name(): string { return normalizeIconName(this.getAttribute('name') ?? ''); }
  set name(value: string) { this.setAttribute('name', value); }
  get variant(): IconVariant {
    const value = this.getAttribute('variant');
    return value === 'filled' || value === 'color' ? value : 'regular';
  }
  set variant(value: IconVariant) { this.setAttribute('variant', value); }
  /** Explicit pixel size, or undefined to inherit 1em. Design defaults to 24. */
  get size(): number | undefined {
    const value = Number(this.getAttribute('size'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  set size(value: number | undefined) {
    if (value === undefined) this.removeAttribute('size');
    else this.setAttribute('size', String(value));
  }
  get label(): string { return this.getAttribute('label') ?? ''; }
  set label(value: string) { this.setAttribute('label', value); }
  get flipRtl(): boolean { return this.hasAttribute('flip-rtl'); }
  set flipRtl(value: boolean) { this.toggleAttribute('flip-rtl', value); }
  /** Resolves after the latest scheduled render (including any lazy load). */
  get updateComplete(): Promise<void> { return this.#waitForUpdates(); }

  async #waitForUpdates(): Promise<void> {
    for (;;) {
      const pending = this.#complete;
      await pending;
      if (pending === this.#complete) return;
    }
  }

  connectedCallback(): void {
    // Recover properties assigned before the browser upgraded this element.
    for (const key of ['name', 'variant', 'size', 'label', 'flipRtl'] as const) {
      if (Object.prototype.hasOwnProperty.call(this, key)) {
        const value = this[key];
        delete (this as unknown as Record<string, unknown>)[key];
        (this as unknown as Record<string, unknown>)[key] = value;
      }
    }
    this.#unsubscribe?.();
    this.#unsubscribe = subscribe((name) => { if (!name || name === this.name) this.#schedule(); });
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#revision++;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) this.#schedule();
  }

  /** Retry a failed lazy request, or explicitly refresh the element. */
  refresh(): Promise<void> { this.#schedule(); return this.updateComplete; }

  #schedule(): void {
    this.#revision++;
    if (!this.isConnected || this.#queued) return;
    this.#queued = true;
    this.#complete = new Promise<void>((resolve) => {
      queueMicrotask(() => {
        this.#queued = false;
        void this.#render(this.#revision).finally(resolve);
      });
    });
  }

  #showSkeleton(): void {
    if (this.#skeleton) return;
    const skeleton = this.ownerDocument.createElement('span');
    skeleton.setAttribute('part', 'skeleton');
    skeleton.setAttribute('aria-hidden', 'true');
    this.#skeleton = skeleton;
    this.shadowRoot!.append(skeleton);
  }

  #hideSkeleton(): void {
    this.#skeleton?.remove();
    this.#skeleton = undefined;
  }

  async #render(revision: number): Promise<void> {
    const name = this.name;
    const size = this.size;
    if (size === undefined) this.style.removeProperty('--_fluent-icon-size');
    else this.style.setProperty('--_fluent-icon-size', `${size}px`);
    if (!name || !this.isConnected) {
      this.#svg?.remove();
      this.#svg = undefined;
      this.#hideSkeleton();
      return;
    }
    const waiting = !getIcon(name);
    if (waiting) {
      this.#svg?.remove();
      this.#svg = undefined;
      this.#showSkeleton();
    }
    try {
      const definition = await loadIcon(name);
      if (revision !== this.#revision || !this.isConnected) return;
      if (!definition) throw new Error(`Unknown Fluent icon: ${name}`);
      const glyph = selectGlyph(definition, size ?? 24, this.variant);
      if (!glyph) throw new Error(`No glyph available for ${name}`);
      const svg = this.ownerDocument.createElementNS(svgNamespace, 'svg');
      svg.setAttribute('part', 'svg');
      svg.setAttribute('viewBox', glyph.viewBox?.join(' ') ?? `0 0 ${glyph.size} ${glyph.size}`);
      svg.setAttribute('focusable', 'false');
      if (glyph.fill !== undefined) svg.style.fill = glyph.fill;
      const label = (this.label || this.getAttribute('aria-label') || '').trim();
      if (label) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
      } else {
        svg.setAttribute('aria-hidden', 'true');
      }
      for (const data of glyph.paths) {
        const path = this.ownerDocument.createElementNS(svgNamespace, 'path');
        path.setAttribute('d', data.d);
        if (data.fillRule) path.setAttribute('fill-rule', data.fillRule);
        if (data.clipRule) path.setAttribute('clip-rule', data.clipRule);
        if (data.opacity !== undefined) path.setAttribute('opacity', String(data.opacity));
        if (data.fill !== undefined) path.setAttribute('fill', data.fill);
        if (data.stroke !== undefined) path.setAttribute('stroke', data.stroke);
        svg.append(path);
      }
      if (glyph.nodes) appendSvgNodes(svg, glyph.nodes, `fi${++svgInstance}-`);
      this.#svg?.remove();
      this.#hideSkeleton();
      this.#svg = svg;
      this.shadowRoot!.append(svg);
      this.dispatchEvent(new CustomEvent<IconLoadDetail>('icon-load', {
        detail: { name, variant: glyph.variant, size: glyph.size }, bubbles: true, composed: true,
      }));
    } catch (error) {
      if (revision !== this.#revision || !this.isConnected) return;
      this.#svg?.remove();
      this.#svg = undefined;
      this.#hideSkeleton();
      this.dispatchEvent(new CustomEvent<IconErrorDetail>('icon-error', {
        detail: { name, error: error instanceof Error ? error : new Error(String(error)) }, bubbles: true, composed: true,
      }));
    }
  }
}

/** Register once; custom tags can coexist with the default tag. */
export function defineFluentIcon(tagName = 'fluent-icon', registry = globalThis.customElements): typeof FluentIcon | undefined {
  if (!registry) return undefined;
  const existing = registry.get(tagName);
  if (existing) {
    if (existing !== FluentIcon && !(existing.prototype instanceof FluentIcon)) {
      throw new Error(`Custom element ${tagName} is already defined by another library`);
    }
    return existing as typeof FluentIcon;
  }
  const constructor = tagName === 'fluent-icon' ? FluentIcon : class extends FluentIcon {};
  registry.define(tagName, constructor);
  return constructor;
}

declare global {
  interface HTMLElementTagNameMap { 'fluent-icon': FluentIcon; }
  interface HTMLElementEventMap {
    'icon-load': CustomEvent<IconLoadDetail>;
    'icon-error': CustomEvent<IconErrorDetail>;
  }
}
