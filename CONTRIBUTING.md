# Contributing

Thanks for helping with this unofficial Fluent System Icons web component.

## Setup

Install [Bun](https://bun.sh) 1.3.14 or later (see `.bun-version`). Browser tests
also need Node.js 22+.

```sh
bun install
bun run dev
```

The explorer is http://127.0.0.1:5173. Generated icon modules are not committed;
`bun run generate` (and the other scripts that call it) recreate them.

## What belongs here

- Runtime, generator, tests, and packaging for `<fluent-icon>`.
- Bug reports against this wrapper (loading, accessibility, types, publish).

New artwork, missing sizes, and icon design issues belong in
[microsoft/fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons).
This repo only consumes `@fluentui/svg-icons`.

Do not edit files under `src/generated/`. Change the parser or generator instead
and regenerate.

## Checks

```sh
bun run check
bun run verify:generation
bun run verify:package
```

Keep the published package dependency-free. Demo Fluent UI controls stay in
`demo/`; they must not become runtime dependencies.

The package version must match the installed `@fluentui/svg-icons` version.
The first npm release is `bun run release:first` after `npm login`. Later icon
catalog updates are automated once trusted publishers are configured.

## Explorer deploy

The icon explorer is Workers static assets on [icons.l5z12.dev](https://icons.l5z12.dev).
GitHub Actions deploys it from `.github/workflows/deploy-explorer.yml` using:

- `CLOUDFLARE_API_TOKEN` — token with Workers edit permission
- `CLOUDFLARE_ACCOUNT_ID` — the account that owns the `l5z12.dev` zone

`l5z12.dev` must already be a zone on that account. Wrangler attaches the custom
domain on deploy; remove any conflicting DNS record for `icons` first.

Locally: `bun run preview:site` then `bun run deploy` after `wrangler login`.

## License

Contributions are MIT, same as [LICENSE](LICENSE). Upstream SVG artwork remains
Microsoft's MIT-licensed Fluent System Icons.
