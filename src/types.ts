export type IconVariant = 'regular' | 'filled' | 'color';

/** A constrained SVG path. No raw markup, URLs, or executable attributes. */
export interface IconPath {
  readonly d: string;
  readonly fillRule?: 'nonzero' | 'evenodd';
  readonly clipRule?: 'nonzero' | 'evenodd';
  readonly opacity?: number;
  readonly fill?: string;
  readonly stroke?: string;
}

export interface IconGlyph {
  readonly size: number;
  readonly viewBox?: readonly [number, number, number, number];
  readonly variant: IconVariant;
  readonly paths: readonly IconPath[];
  /** Structured SVG artwork for gradients, shapes, clipping, and filters. */
  readonly nodes?: readonly IconSvgNode[];
  readonly fill?: string;
}

export type IconSvgTag = 'path' | 'g' | 'defs' | 'linearGradient' | 'radialGradient' | 'stop' |
  'rect' | 'circle' | 'ellipse' | 'clipPath' | 'filter' | 'feFlood' | 'feColorMatrix' |
  'feOffset' | 'feGaussianBlur' | 'feBlend';

/** Validated SVG elements. External resources, scripts, and event attributes are forbidden. */
export interface IconSvgNode {
  readonly tag: IconSvgTag;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children?: readonly IconSvgNode[];
}

export interface IconDefinition {
  readonly name: string;
  readonly glyphs: readonly IconGlyph[];
}

export type IconResolver = (name: string) => IconDefinition | undefined | Promise<IconDefinition | undefined>;

export interface IconLoadDetail {
  name: string;
  /** The actual design variant and size, after fallback. */
  variant: IconVariant;
  size: number;
}

export interface IconErrorDetail {
  name: string;
  error: Error;
}
