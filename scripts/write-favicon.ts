import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const upstream = join(root, 'node_modules/@fluentui/svg-icons/icons');
const names = ['mail', 'home', 'code', 'star'] as const;
const sourceSize = 16;
const canvas = 32;
const pad = 2;
const gap = 2;
const cell = (canvas - pad * 2 - gap) / 2;
const scale = cell / sourceSize;

function inner(svg: string, filename: string): string {
  const match = svg.trim().match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  if (!match) throw new Error(`${filename}: expected one SVG root`);
  return match[1]!;
}

export async function writeExplorerFavicon(destination = join(root, 'demo/favicon.svg')): Promise<void> {
  const groups = await Promise.all(names.map(async (name, index) => {
    const filename = `${name}_${sourceSize}_color.svg`;
    const svg = await Bun.file(join(upstream, filename)).text();
    const x = pad + (index % 2) * (cell + gap);
    const y = pad + Math.floor(index / 2) * (cell + gap);
    return `<g transform="translate(${x} ${y}) scale(${scale})">${inner(svg, filename)}</g>`;
  }));
  await Bun.write(destination, `<!-- Generated from @fluentui/svg-icons. Fluent System Icons © Microsoft. MIT. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}">
  <title>Fluent icons</title>
  <style>
    .tile { fill: #fff; }
    @media (prefers-color-scheme: dark) { .tile { fill: #292929; } }
  </style>
  <rect class="tile" width="${canvas}" height="${canvas}" rx="8" fill="#fff"/>
  ${groups.join('\n  ')}
</svg>
`);
}

if (import.meta.main) await writeExplorerFavicon();
