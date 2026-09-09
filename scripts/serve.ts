import { watch } from 'node:fs';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..');
const development = process.argv.includes('--dev');
let revision = 0;
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 5173),
  async fetch(request) {
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); }
    catch { return new Response('Invalid URL', { status: 400 }); }
    if (pathname === '/__revision') return Response.json({ revision, development });
    const isLibrary = pathname.startsWith('/dist/');
    const area = resolve(root, isLibrary ? 'dist' : 'demo');
    const relative = pathname === '/' ? 'index.html' : pathname.slice(isLibrary ? '/dist/'.length : 1);
    const target = resolve(area, relative);
    if (!target.startsWith(area + sep)) return new Response('Forbidden', { status: 403 });
    const file = Bun.file(target);
    if (!await file.exists()) return new Response('Not found', { status: 404 });
    return new Response(file, { headers: { 'Cache-Control': 'no-cache' } });
  },
});
console.log(`Fluent icon explorer: ${server.url}`);

if (development) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let building = false;
  let dirty = false;
  async function rebuild() {
    if (building) { dirty = true; return; }
    building = true;
    const process = Bun.spawn(['bun', 'run', 'build'], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
    if (await process.exited === 0) revision++;
    building = false;
    if (dirty) { dirty = false; void rebuild(); }
  }
  watch(resolve(root, 'src'), { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes('generated')) return;
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(), 150);
  });
  watch(resolve(root, 'demo'), { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes('generated')) return;
    if (filename.endsWith('.ts')) {
      clearTimeout(timer);
      timer = setTimeout(() => void rebuild(), 150);
    } else revision++;
  });
}
