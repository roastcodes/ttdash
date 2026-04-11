# Releasing TTDash

## First-Time npm Setup

Before the first public release, configure npm Trusted Publishing for this repository.

1. Create or use the npm account that can publish `@roastcodes/ttdash`
2. Enable 2FA on that npm account
3. Ensure you have publish rights in the `roastcodes` npm organization
4. In npm package settings, add this GitHub repository as a trusted publisher for `@roastcodes/ttdash`
5. Confirm the GitHub Actions release workflow is allowed to request an OIDC token

Trusted Publishing is preferred because it avoids long-lived npm tokens and enables provenance for public publishes.

If you want npm provenance on the published package, the GitHub repository must be public when the release workflow runs.

## Release Checklist

1. Update `package.json` version
2. Add the matching section to `CHANGELOG.md`
3. Run the full local verification suite:

```bash
npm run test:unit:coverage
npm run build
npm run verify:package
PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e
```

4. Merge the release changes to `main`
5. Create and push a tag that matches the package version exactly

Example:

```bash
bash scripts/tag-main-release.sh
```

Optional explicit version:

```bash
bash scripts/tag-main-release.sh 6.1.3
```

Dry-run preview:

```bash
bash scripts/tag-main-release.sh --dry-run
```

## What the Release Workflow Does

On a `v*` tag push, the workflow:

1. verifies the tagged commit is on `main`
2. verifies the tag matches `package.json`
3. runs unit/integration tests with coverage
4. builds the production bundle
5. verifies the packed npm artifact
6. runs the Playwright smoke suite
7. publishes `@roastcodes/ttdash` to npm through Trusted Publishing
8. waits for npm registry propagation
9. verifies:
   - `npx --yes @roastcodes/ttdash@<version> --help`
   - `bunx @roastcodes/ttdash@<version> --help`
10. creates the GitHub release

## Post-Publish Checks

After the workflow succeeds, run a final sanity check:

```bash
npm view @roastcodes/ttdash version description bin --json
npx --yes @roastcodes/ttdash@latest --help
bunx @roastcodes/ttdash@latest --help
```

Optional runtime smoke test:

```bash
NO_OPEN_BROWSER=1 PORT=3010 npx --yes @roastcodes/ttdash@latest
```

Then open `http://127.0.0.1:3010`.
