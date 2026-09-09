import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const pkg = await Bun.file(join(root, 'package.json')).json();
const name = String(pkg.name);
const version = String(pkg.version);

if (await npmHasVersion(name, version)) {
  throw new Error(`${name}@${version} is already on npm. After trusted publishers are configured, push a version tag.`);
}
if (await npmListed(name)) {
  throw new Error(`${name} is already on npm. Later versions publish from GitHub Actions, not this script.`);
}

process.env.GITHUB_REPOSITORY ||= 'l5z12/fluentui-web-icons';
const metadata = Bun.spawn(['bun', 'scripts/set-publish-metadata.ts'], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
if (await metadata.exited !== 0) process.exit(1);

const npm = Bun.which('npm');
if (!npm) throw new Error('npm is required for the first publish');
const whoami = Bun.spawn([npm, 'whoami'], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
const identity = `${await new Response(whoami.stdout).text()}${await new Response(whoami.stderr).text()}`.trim();
if (await whoami.exited !== 0) throw new Error('Run npm login before bun run release:first');
console.log(`Publishing ${name}@${version} as ${identity} from this machine.`);
console.log('Add GitHub Actions trusted publishers after this succeeds; automation cannot be the first publisher.');

const publish = Bun.spawn([npm, 'publish', '--access', 'public'], { cwd: root, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
process.exit(await publish.exited);

async function npmListed(packageName: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, { headers: { accept: 'application/json', 'user-agent': 'fluentui-web-icons-sync' } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Failed to read ${packageName} from npm (${response.status})`);
  return true;
}

async function npmHasVersion(packageName: string, packageVersion: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(packageVersion)}`, { headers: { accept: 'application/json', 'user-agent': 'fluentui-web-icons-sync' } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Failed to read ${packageName}@${packageVersion} from npm (${response.status})`);
  return true;
}
