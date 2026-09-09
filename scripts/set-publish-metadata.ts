import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const repo = process.env.GITHUB_REPOSITORY ?? '';
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  if (process.env.GITHUB_ACTIONS) throw new Error('GITHUB_REPOSITORY is required to publish');
  process.exit(0);
}
const url = `https://github.com/${repo}`;
const path = join(root, 'package.json');
const pkg = await Bun.file(path).json();
pkg.repository = { type: 'git', url: `${url}.git` };
pkg.bugs = { url: `${url}/issues` };
pkg.homepage = 'https://icons.l5z12.dev/';
await Bun.write(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Publish metadata set for ${url}`);
