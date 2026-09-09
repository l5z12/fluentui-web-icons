import { cp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..');
const site = join(root, 'site');
if (site !== join(root, 'site')) throw new Error('Unsafe site destination');
await rm(site, { recursive: true, force: true });
await cp(join(root, 'demo'), site, {
  recursive: true,
  filter: (source) => !source.replaceAll('\\', '/').endsWith('/test.html'),
});
await cp(join(root, 'dist'), join(site, 'dist'), {
  recursive: true,
  filter: (source) => {
    const name = source.split(sep).at(-1) ?? '';
    return !name.endsWith('.d.ts') && !name.endsWith('.map');
  },
});
if (!await Bun.file(join(site, 'dist/auto.js')).exists() || !await Bun.file(join(site, 'index.html')).exists()) {
  throw new Error('Staged site is missing the explorer or compiled library');
}
console.log('Staged static explorer in site/.');
