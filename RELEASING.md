# Releasing TTDash

## First-Time npm Setup

Before the first public release, configure npm Trusted Publishing for this repository.

1. Create or use the npm account that can publish `@roastcodes/ttdash`
2. Enable 2FA on that npm account
3. Ensure you have publish rights in the `roastcodes` npm organization
4. In npm package settings, add this GitHub repository as a trusted publisher for `@roastcodes/ttdash`
5. Confirm the GitHub Actions release workflow is allowed to request an OIDC token
6. Install the `ttdash-release` GitHub App on `roastcodes/ttdash`
7. Add `APP_ID` and `APP_PRIVATE_KEY` as Actions secrets for this repository
8. Add the `ttdash-release` GitHub App as a bypass actor in the `main` ruleset

Trusted Publishing is preferred because it avoids long-lived npm tokens and enables provenance for public publishes.

If you want npm provenance on the published package, the GitHub repository must be public when the release workflow runs.

## GitHub Repository Setup

Before using the manual release workflow, make sure:

1. `main` is protected and requires the `CI` status check before merges
2. CodeQL is enabled in the GitHub UI if you want it as a manual release gate
3. the `ttdash-release` GitHub App is allowed to push the version-bump commit and annotated tag back to `main`

If branch protection or rulesets block the `ttdash-release` app from writing to `main` or pushing `v*` tags, the workflow will fail when it tries to push the release commit or tag.

## Release Checklist

1. Merge the intended release state to `main`
2. Confirm the latest `CI` run on `main` succeeded
3. Confirm CodeQL is green in the GitHub UI
4. Start the `Release` workflow manually from GitHub Actions and provide the target version in `x.y.z` format

Optional local confidence check before starting the workflow:

```bash
npm run test:unit:coverage
npm run build
npm run verify:package
PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e
```

## What the Release Workflow Does

On a manual `workflow_dispatch` run against `main`, the workflow:

1. verifies the requested version is greater than the current `package.json` version
   or resumes a partially completed release when the requested version is already on `main`
2. verifies the latest `CI` run for the current `main` commit succeeded
3. bumps `package.json` and `package-lock.json` to the requested version
4. runs unit/integration tests with coverage
5. builds the production bundle
6. verifies the packed npm artifact
7. runs the Playwright smoke suite
8. creates and pushes the release commit and annotated tag
9. publishes `@roastcodes/ttdash` to npm through Trusted Publishing
10. waits for npm registry propagation
11. verifies:
   - `npx --yes @roastcodes/ttdash@<version> --help`
   - `bunx @roastcodes/ttdash@<version> --help`
12. creates the GitHub release

Note: the workflow reruns the release-critical test suite itself after the version bump. This is necessary because the workflow-created push back to `main` should not be relied on to trigger the normal `CI` workflow again.
If a release fails after the version bump was already pushed, rerunning the workflow with the same version resumes that release instead of forcing another version bump.

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
