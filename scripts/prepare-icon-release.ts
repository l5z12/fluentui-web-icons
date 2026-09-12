import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const upstream = await Bun.file(join(root, 'node_modules/@fluentui/svg-icons/package.json')).json();
const version = String(upstream.version ?? '');
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Unexpected @fluentui/svg-icons version: ${version}`);

const packagePath = join(root, 'package.json');
const pkg = await Bun.file(packagePath).json();
if (pkg.version !== version || pkg.devDependencies['@fluentui/svg-icons'] !== version) {
  pkg.version = version;
  pkg.devDependencies = { ...pkg.devDependencies, '@fluentui/svg-icons': version };
  await Bun.write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const changelogPath = join(root, 'CHANGELOG.md');
const changelog = await Bun.file(changelogPath).text();
const heading = `## ${version}`;
if (!changelog.includes(`\n${heading}\n`) && !changelog.startsWith(`${heading}\n`)) {
  const entry = `${heading}\n\n- Sync icon artwork from \`@fluentui/svg-icons\` ${version}.\n`;
  await Bun.write(changelogPath, changelog.replace('# Changelog\n', `# Changelog\n\n${entry}`));
}

const readmePath = join(root, 'README.md');
const readme = await Bun.file(readmePath).text();
await Bun.write(readmePath, readme
  .replace(/git tag v\d+\.\d+\.\d+/g, `git tag v${version}`)
  .replace(/git push origin v\d+\.\d+\.\d+/g, `git push origin v${version}`));
console.log(`Package version set to ${version} to match @fluentui/svg-icons.`);
