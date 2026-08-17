# Contributing

## Developing

- Pure JavaScript, no build step — `lib/*.js` is the shipped artifact.
- Before committing, syntax-check every module: `node --check lib/<file>.js` (the package is `type: module`, so import statements parse).
- Validate the manifest: `node scripts/validate.mjs`.

## Releasing

1. Bump `version` in `package.json` and add a CHANGELOG entry.
2. Push a tag: `git tag v<version> && git push --tags`.
3. Optionally publish to npm (`npm publish`) so `dsh plugin add dsh-delegation-suite` installs the prebuilt package.

## Reporting issues

Open a GitHub issue. For security matters see SECURITY.md.
