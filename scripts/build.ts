import { cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const out = join(root, 'dist');
// Fixed, resolved output directory inside this project.
if (out !== join(root, 'dist')) throw new Error('Unsafe build destination');
await rm(out, { recursive: true, force: true });
const compiler = Bun.spawn(['bun', 'x', '--no-install', 'tsc', '-p', 'tsconfig.build.json'], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
if (await compiler.exited !== 0) process.exit(1);
await cp(join(root, 'src/generated'), join(out, 'generated'), { recursive: true });
console.log('Built browser ESM modules and TypeScript declarations in dist/.');
const demo = await Bun.build({
  entrypoints: [join(root, 'demo/components.ts')],
  outdir: join(root, 'demo/generated'),
  target: 'browser',
  minify: true,
});
if (!demo.success) throw new AggregateError(demo.logs, 'Fluent UI demo bundle failed');
console.log('Built Fluent UI web components for the demo.');
