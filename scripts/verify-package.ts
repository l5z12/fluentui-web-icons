import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dir, '..');
const temporary = await mkdtemp(join(tmpdir(), 'fluent-icons-consumer-'));
const npm = Bun.which('npm') ?? 'npm';
const node = Bun.which('node') ?? 'node';

async function run(command: string[], cwd = temporary) {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`${command.join(' ')} failed\n${stdout}\n${stderr}`);
  return stdout;
}

function assertEsmExport(entry: unknown, types: string, js: string, label: string, requireDefault = true) {
  const value = entry as { types?: string; import?: string; default?: string };
  if (value?.types !== types || value?.import !== js || (requireDefault && value?.default !== js)) {
    throw new Error(`Invalid ESM export for ${label}`);
  }
}

try {
  const packedManifest = await Bun.file(join(root, 'package.json')).json();
  await run([npm, 'pack', '--ignore-scripts', `--pack-destination=${temporary}`], root);
  const archive = join(temporary, `${packedManifest.name}-${packedManifest.version}.tgz`);
  if (!await Bun.file(archive).exists()) throw new Error(`npm pack did not write ${archive}`);
  await Bun.write(join(temporary, 'package.json'), JSON.stringify({
    name: 'fluent-icons-consumer',
    private: true,
    type: 'module',
    dependencies: { 'fluentui-web-icons': `file:${archive.replaceAll('\\', '/')}` },
  }));
  await run([npm, 'install', '--ignore-scripts', '--no-fund', '--no-audit']);
  await Bun.write(join(temporary, 'consumer.ts'), `
import { defineFluentIcon, registerIcons, getIcon } from 'fluentui-web-icons';
import type { IconName } from 'fluentui-web-icons';
import home from 'fluentui-web-icons/icons/home';
const name: IconName = 'home';
// @ts-expect-error Unknown generated names must remain type errors.
const invalidName: IconName = 'this-is-not-an-upstream-icon';
registerIcons(home);
defineFluentIcon();
if (getIcon(name)?.name !== name) throw new Error('Broken public exports');
`);
  await Bun.write(join(temporary, 'color-consumer.ts'), `
import { loadIcon, selectGlyph } from 'fluentui-web-icons';
import type { IconVariant } from 'fluentui-web-icons';
import { enableIconLoader } from 'fluentui-web-icons/lazy';
const variant: IconVariant = 'color';
enableIconLoader();
const mail = await loadIcon('mail');
if (!mail || !selectGlyph(mail, 24, variant)?.nodes?.length) throw new Error('Packaged color artwork is missing');
`);
  await Bun.write(join(temporary, 'node-consumer.js'), `
import { defineFluentIcon, registerIcons, getIcon } from 'fluentui-web-icons';
import home from 'fluentui-web-icons/icons/home';
import { enableIconLoader } from 'fluentui-web-icons/lazy';
registerIcons(home);
enableIconLoader();
defineFluentIcon();
if (getIcon('home')?.name !== 'home') throw new Error('Node cannot resolve package exports');
`);
  await run(['bun', 'consumer.ts']);
  await run(['bun', 'color-consumer.ts']);
  await run([node, 'node-consumer.js']);
  await run(['bun', join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', '--moduleResolution', 'bundler', '--module', 'esnext', '--target', 'es2022', 'consumer.ts', 'color-consumer.ts']);
  const bundle = await Bun.build({ entrypoints: [join(temporary, 'consumer.ts')], target: 'browser', minify: true });
  if (!bundle.success || bundle.outputs.length !== 1) throw new Error(`Consumer bundle failed: ${bundle.logs}`);
  const source = await bundle.outputs[0]!.text();
  if (source.includes('accessibility-checkmark') || source.includes('arrow-autofit-content')) throw new Error('Single-icon import bundled unrelated families');
  const packedRoot = join(temporary, 'node_modules/fluentui-web-icons');
  const manifest = await Bun.file(join(packedRoot, 'custom-elements.json')).json();
  if (manifest.modules[0].declarations[0].tagName !== 'fluent-icon') throw new Error('Missing custom element manifest');
  for (const file of ['LICENSE', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'dist/generated/loaders.js', 'dist/generated/catalog.js', 'dist/auto.js']) {
    if (!await Bun.file(join(packedRoot, file)).exists()) throw new Error(`Missing published file: ${file}`);
  }
  if (await Bun.file(join(packedRoot, 'src/index.ts')).exists()) throw new Error('Package unintentionally includes source tree');
  if (await Bun.file(join(packedRoot, 'demo/generated/components.js')).exists()) throw new Error('Icon package includes demo dependencies');
  if (await Bun.file(join(packedRoot, 'scripts/build.ts')).exists()) throw new Error('Package includes build scripts');
  const packedPackage = await Bun.file(join(packedRoot, 'package.json')).json();
  if (packedPackage.private) throw new Error('Package is marked private and cannot be published');
  if (packedPackage.type !== 'module') throw new Error('Published package must be ESM');
  if (packedPackage.license !== 'MIT') throw new Error('Published package must keep the MIT license');
  if (packedPackage.customElements !== 'custom-elements.json') throw new Error('Missing customElements package field');
  if (Object.keys(packedPackage.dependencies ?? {}).length) throw new Error('Icon runtime must stay dependency-free');
  const upstream = await Bun.file(join(root, 'node_modules/@fluentui/svg-icons/package.json')).json();
  if (packedPackage.version !== upstream.version) throw new Error(`Package version ${packedPackage.version} must match @fluentui/svg-icons ${upstream.version}`);
  assertEsmExport(packedPackage.exports['.'], './dist/index.d.ts', './dist/index.js', '.');
  assertEsmExport(packedPackage.exports['./auto'], './dist/auto.d.ts', './dist/auto.js', './auto');
  assertEsmExport(packedPackage.exports['./lazy'], './dist/lazy.d.ts', './dist/lazy.js', './lazy');
  assertEsmExport(packedPackage.exports['./catalog'], './dist/generated/catalog.d.ts', './dist/generated/catalog.js', './catalog');
  assertEsmExport(packedPackage.exports['./icons/*'], './dist/generated/icons/*.d.ts', './dist/generated/icons/*.js', './icons/*', false);
  await run(['bun', 'x', '--no-install', 'publint', '--pack', 'npm'], root);
  await run(['bun', 'x', '--no-install', 'attw', archive, '--profile', 'esm-only', '--entrypoints', '.', 'auto', 'lazy', 'catalog', 'icons/home'], root);
  const compressed = Bun.gzipSync(source).byteLength;
  const packedBytes = Bun.file(archive).size;
  if (packedBytes > 80 * 1024 * 1024) throw new Error(`Tarball is ${(packedBytes / 1024 / 1024).toFixed(2)} MiB; too large to publish reliably`);
  console.log(`Packed consumer works with npm, Node, Bun, TypeScript, and browser bundling. Home + runtime: ${source.length.toLocaleString()} bytes minified / ${compressed.toLocaleString()} bytes gzip.`);
  console.log(`Archive: ${(packedBytes / 1024 / 1024).toFixed(2)} MiB; zero runtime dependencies.`);
  if (process.argv.includes('--keep-artifact')) {
    const filename = `${packedPackage.name}-${packedPackage.version}.tgz`.replace(/[^a-zA-Z0-9_.-]/g, '-');
    await copyFile(archive, join(root, filename));
    console.log(`Saved verified archive: ${filename}`);
  }
} finally {
  // Only remove the unique temporary directory created by this script.
  const parent = resolve(tmpdir());
  if (!resolve(temporary).startsWith(parent + sep) || !temporary.split(sep).at(-1)?.startsWith('fluent-icons-consumer-')) throw new Error('Unsafe cleanup path');
  await rm(temporary, { recursive: true, force: true });
}
