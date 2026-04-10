# Releasing TTDash

## First-time npm setup

Before the first public release, configure npm Trusted Publishing for this repository.

1. Create or use the npm account that will own `ttdash`
2. Enable 2FA on that npm account
3. In npm package settings, add this GitHub repository as a trusted publisher
4. Confirm the GitHub Actions release workflow is allowed to request an OIDC token

Trusted Publishing is the preferred setup because it avoids long-lived npm tokens and enables npm provenance for public releases.

## Release checklist

1. Update `package.json` version
2. Add the matching section to `CHANGELOG.md`
3. Run the full verification suite locally:

```bash
npm run test:unit:coverage
npm run build
npm run verify:package
npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e
```

4. Push the release branch and merge to `main`
5. Create and push a git tag that matches the package version exactly:

```bash
git tag v6.0.12
git push origin v6.0.12
```

## What the release workflow does

On a `v*` tag push, the workflow:

1. verifies the tagged commit is on `main`
2. verifies the tag matches `package.json`
3. runs tests and build
4. verifies the packed npm artifact
5. publishes to npm with provenance
6. waits for npm registry propagation
7. verifies:
   - `npx --yes ttdash@<version> --help`
   - `bunx ttdash@<version> --help`
8. creates the GitHub release

## Post-publish checks

After the workflow succeeds, verify these manually as a final sanity check:

```bash
npm view ttdash version description bin --json
npx --yes ttdash@latest --help
bunx ttdash@latest --help
```

Optional runtime smoke test:

```bash
NO_OPEN_BROWSER=1 PORT=3010 npx --yes ttdash@latest
```

Then open `http://127.0.0.1:3010`.
