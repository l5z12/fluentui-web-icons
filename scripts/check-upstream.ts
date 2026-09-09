import { appendFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const pkg = await Bun.file(join(root, 'package.json')).json();
const current = String(pkg.devDependencies['@fluentui/svg-icons'] ?? '').replace(/^[^\d]*/, '');
const latest = await npmLatest('@fluentui/svg-icons');
const alreadyPublished = await npmHasVersion(pkg.name, latest);
const updateDependency = current !== latest;
const release = latest !== current || pkg.version !== latest || !alreadyPublished;

await setOutput({ latest, current, version: pkg.version, update_dependency: updateDependency, release });
console.log(`@fluentui/svg-icons ${current} → ${latest}; package ${pkg.version}; npm ${alreadyPublished ? 'has' : 'missing'} ${latest}; release=${release}`);
if (!release) console.log('Already in sync with @fluentui/svg-icons.');

async function npmLatest(name: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, { headers: { accept: 'application/json', 'user-agent': 'fluentui-web-icons-sync' } });
  if (!response.ok) throw new Error(`Failed to read ${name} from npm (${response.status})`);
  const body = await response.json() as { version?: string };
  if (!body.version) throw new Error(`npm latest for ${name} has no version`);
  return body.version;
}

async function npmHasVersion(name: string, version: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { headers: { accept: 'application/json', 'user-agent': 'fluentui-web-icons-sync' } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Failed to read ${name} from npm (${response.status})`);
  const body = await response.json() as { versions?: Record<string, unknown> };
  return Object.hasOwn(body.versions ?? {}, version);
}

async function setOutput(values: Record<string, string | boolean>): Promise<void> {
  const file = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join('');
  if (file) await appendFile(file, lines);
}