# fluentui-web-icons

Microsoft's Fluent System Icons as accessible, native web components. No framework,
icon font, network service, or runtime dependency required.

This is an independent wrapper, not an official Microsoft package. The artwork is
from [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons).

<!-- icon-stats:start -->
**2,981 families / 20,523 designs**, generated from `@fluentui/svg-icons` 1.1.341.
<!-- icon-stats:end -->

[![npm](https://img.shields.io/npm/v/fluentui-web-icons.svg)](https://www.npmjs.com/package/fluentui-web-icons)
[![license](https://img.shields.io/npm/l/fluentui-web-icons.svg)](LICENSE)

Live explorer: [icons.l5z12.dev](https://icons.l5z12.dev)

- Regular, filled, and color variants, with every upstream optical size.
- Import only the families you use; optional on-demand loading for the rest.
- TypeScript declarations, typed icon names, and a Custom Elements Manifest.
- Shadow DOM, inherited color, accessible labels, and optional RTL mirroring.
- Version matches `@fluentui/svg-icons`.

## Install

```sh
npm install fluentui-web-icons
```

Also works with `pnpm add`, `yarn add`, and `bun add`. The package is ESM-only
and has no runtime dependencies. Rendering requires a browser.

## Quick start

Browsers only download the icon families you import. A bundler leaves the rest
out of the JavaScript it serves:

```ts
import { defineFluentIcon, registerIcons } from 'fluentui-web-icons';
import home from 'fluentui-web-icons/icons/home';
import arrowLeft from 'fluentui-web-icons/icons/arrow-left';

registerIcons(home, arrowLeft);
defineFluentIcon();
```

```html
<fluent-icon name="home" size="24" label="Home"></fluent-icon>
<fluent-icon name="arrow-left" variant="filled" flip-rtl></fluent-icon>
```

Each family module includes all available sizes and styles. The core entry never
imports the catalog or loader map. Default family exports avoid naming ambiguity;
named exports are also available, for example `iconHome` and `iconArrowLeft`.

### Color icons

```ts
import mail from 'fluentui-web-icons/icons/mail';
registerIcons(mail);
```

```html
<fluent-icon name="mail" variant="color" size="48" label="Inbox"></fluent-icon>
```

Color artwork keeps the upstream palette, gradients, opacity, clipping, and
filters. Each rendered SVG gets its own IDs, so repeated icons do not share
gradient definitions.

### Load families on demand

```ts
import 'fluentui-web-icons/auto';
```

This registers `<fluent-icon>` and a lazy resolver. The page loads a family
index, then **one module per requested name** (`mail` never fetches `home`).
The index lists import paths; it does not include SVG geometry. Use a bundler
with dynamic-import code splitting, or keep the `dist/` tree together:

```html
<script type="module" src="./dist/auto.js"></script>
<fluent-icon name="mail" size="24" label="Inbox"></fluent-icon>
```

The loader only imports local modules. Registration is repeatable; conflicts
with an unrelated existing element throw. Use `defineFluentIcon('my-icon')`
for a custom tag.

### Configure loading yourself

```ts
import { defineFluentIcon, loadIcon, setIconResolver } from 'fluentui-web-icons';
import { enableIconLoader } from 'fluentui-web-icons/lazy';

enableIconLoader();
defineFluentIcon();
await loadIcon('home');

setIconResolver(async (name) => {
  if (name === 'home') return (await import('fluentui-web-icons/icons/home')).default;
});
```

Explicit registrations win over an in-flight resolver. Replacing the resolver
invalidates pending loads; registered icons stay. Unknown names render empty
and dispatch `icon-error`. Retry a failed load with `await element.refresh()`.

## Element API

| Attribute | Property | Default | Behavior |
| --- | --- | --- | --- |
| `name` | `name` | `''` | Kebab-case family; upstream underscores also work. |
| `variant` | `variant` | `regular` | `regular`, `filled`, or `color`; invalid values use regular. |
| `size` | `size` | `undefined` | Positive pixel size; omission/invalid values use `1em`. |
| `label` | `label` | `''` | Accessible name; omit for decorative icons. |
| `flip-rtl` | `flipRtl` | `false` | Mirrors when inherited direction is RTL. |

The optical design defaults to 24. An explicit size selects the nearest
available design in that variant; ties prefer the larger design. Missing
variants fall back to regular, then filled, then color. The rendered
width and height still match the requested size. Original SVG view boxes
are kept, including upstream exceptions.

```ts
const icon = document.querySelector('fluent-icon')!;
icon.name = 'home';
icon.variant = 'filled';
icon.size = 32;
await icon.updateComplete;

icon.addEventListener('icon-load', ({ detail }) => {
  console.log(detail.name, detail.variant, detail.size);
});
icon.addEventListener('icon-error', ({ detail }) => console.error(detail.error));
```

Both events bubble and cross shadow boundaries. `updateComplete` waits for
lazy imports. While a family is downloading, the element shows a `skeleton`
part; cached icons skip it. Load failures are events, not rejected update
promises.

### Styling and accessibility

```css
fluent-icon {
  color: rebeccapurple;
  --fluent-icon-size: 1.5rem;
}

fluent-icon::part(svg) { transition: transform 150ms; }
```

`--fluent-icon-size` overrides visual size only; use the `size` attribute to
choose the optical design. Monochrome paths inherit `currentColor`. A few
upstream pride/identity designs keep explicit colors. The `color` variant
always keeps its original palette.

Give meaningful standalone icons a `label`. An existing `aria-label` is a
fallback. For icon-only buttons, label the **button** and leave the icon
decorative:

```html
<button aria-label="Open inbox">
  <fluent-icon name="mail" size="20"></fluent-icon>
</button>
```

Mirroring is opt-in. Some upstream icons have distinct RTL artwork; use those
named families instead of flipping them.

### Frameworks and server rendering

Register once in the browser, then use the element in HTML, React, Vue, Svelte,
Angular, or any framework that supports custom elements. Vue needs
`isCustomElement: tag => tag === 'fluent-icon'`; Angular needs
`CUSTOM_ELEMENTS_SCHEMA`. React TypeScript projects can augment JSX:

```ts
import type { HTMLAttributes } from 'react';
import type { FluentIcon, IconName, IconVariant } from 'fluentui-web-icons';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'fluent-icon': HTMLAttributes<FluentIcon> & {
        name?: IconName;
        size?: number | string;
        variant?: IconVariant;
        label?: string;
        'flip-rtl'?: '';
      };
    }
  }
}
```

Imports are safe on a server; SVG rendering needs a browser. This package does
not serialize shadow DOM for SSR. Register in your client entry. Do not reuse a
module evaluated without DOM globals in a later synthetic DOM realm.

## Icon explorer

```sh
bun install
bun run dev
```

Open http://127.0.0.1:5173 for search, preview, and copyable examples.
`PORT=...` overrides the port (`$env:PORT` first in PowerShell). Pushing the
default branch deploys the same explorer to [icons.l5z12.dev](https://icons.l5z12.dev)
as Cloudflare Workers static assets.

The demo UI uses Fluent UI Web Components. Those demo dependencies are
bundled into `demo/generated/` and are not part of the published icon package.

## Development

Requires [Bun](https://bun.sh) 1.3.14 or later. Browser tests also need Node.js
22+ for Playwright.

```sh
bun run generate          # Generate or verify outputs against installed upstream
bun run generate --force  # Force a fresh deterministic regeneration
bun run icons:update      # Upgrade upstream, match its version, rebuild, unit-test
bun run verify:generation # Regenerate twice and compare every output byte
bun run build             # Generate, compile ESM/declarations, stage icon modules
bun run site              # Build a static explorer into site/
bun run preview:site      # Serve that build with Wrangler
bun run deploy            # Build and deploy to icons.l5z12.dev
```

The generator reads the lockfile-pinned `@fluentui/svg-icons` package. It
derives family modules, declarations, typed names, search metadata, and lazy
imports. No icon lists or SVG paths are maintained by hand. Generated code is
gitignored and rebuilt before development, typechecking, tests, and packaging.

Generation validates filenames, duplicate designs, attributes, and view boxes.
Unsupported or unsafe SVG content fails the build. Output is staged before
replacement and has no timestamps.

```sh
bunx playwright install chromium firefox webkit
bun run check
bun run verify:generation
bun run verify:package
```

Unit tests run in Bun. Browser tests cover Chromium, Firefox, and WebKit.
`verify:package` packs with npm and checks Node, TypeScript, publint, and that
a single-icon bundle excludes the catalog.

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests and [SECURITY.md](SECURITY.md)
for vulnerability reports.

## Release

The first npm version has to be published from a maintainer machine. npm
cannot attach [trusted publishers](https://docs.npmjs.com/trusted-publishers/)
until the package exists.

```sh
npm login
bun run verify:package
bun run release:first
```

Then add trusted publishers on npm for this repository and both `publish.yml`
and `sync-icons.yml`. Provenance needs a public GitHub repository. After that,
later versions publish from GitHub Actions.

This package's version **matches `@fluentui/svg-icons`**. Every six hours,
`.github/workflows/sync-icons.yml` checks npm, regenerates when that package
publishes, tags `v{version}`, and publishes — only once the package is already
on the registry.

```sh
git tag v1.1.341
git push origin v1.1.341
```

```sh
bun pm pack
```

## License

MIT for the wrapper and Microsoft artwork. See [LICENSE](LICENSE) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
