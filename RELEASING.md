# Releasing TTDash

## First-Time npm Setup

Before the first public release, configure npm Trusted Publishing for this repository.

1. Create or use the npm account that can publish `@roastcodes/ttdash`
2. Enable 2FA on that npm account
3. Ensure you have publish rights in the `roastcodes` npm organization
4. In npm package settings, add this GitHub repository as a trusted publisher for `@roastcodes/ttdash`
5. Confirm the GitHub Actions release workflow is allowed to request an OIDC token
6. Install the `ttdash-release` GitHub App on `roastcodes/ttdash`
7. Add `APP_CLIENT_ID` and `APP_PRIVATE_KEY` as Actions secrets for this repository or the `release` environment
8. Add `OP_SERVICE_ACCOUNT_TOKEN_PUBLIC` as an Actions secret for this repository or the `release` environment
9. Add `OP_SSH_BASE_URL` as an Actions secret for this repository or the `release` environment, point it to the shared 1Password item prefix for the release signer, and make sure it ends with a trailing `/` (otherwise the workflow fails its format-validation step before it attempts to load secrets)
10. Add the `ttdash-release` GitHub App as a bypass actor in the `main` ruleset

The release workflow loads the SSH signing identity from 1Password through the public-repo service account token. `OP_SSH_BASE_URL` must contain only the common item prefix and must end with `/`, for example `op://vault/item/`, while the workflow appends `name`, `comment`, `public key`, and `private key?ssh-format=openssh` internally. The workflow validates this format before loading secrets and exits early with a format error if the trailing slash is missing. The SSH public key must remain added to the maintainer GitHub account as an SSH signing key, and the signing email used by the workflow must stay valid for both GitHub verification and the `roastcodes` organization trailer.

Trusted Publishing is preferred because it avoids long-lived npm tokens and enables provenance for public publishes.

If you want npm provenance on the published package, the GitHub repository must be public when the release workflow runs.

## GitHub Repository Setup

Before using the manual release workflow, make sure:

1. `main` is protected and requires the `CI` status check before merges
2. CodeQL is enabled in the GitHub UI if you want it as a manual release gate
3. the `ttdash-release` GitHub App is allowed to push the version-bump commit and signed tag back to `main`
4. the `roast.codes` domain remains verified for the `roastcodes` organization so the workflow-created `on-behalf-of: @roastcodes <github@roast.codes>` trailer continues to render correctly on GitHub (check GitHub organization settings under verified domains; if verification lapses, restore or confirm the DNS TXT record and re-verify the domain as documented at https://docs.github.com/en/organizations/managing-organization-settings/verifying-or-approving-a-domain-for-your-organization)

If branch protection or rulesets block the `ttdash-release` app from writing to `main` or pushing `v*` tags, the workflow will fail when it tries to push the release commit or tag.

## Release Checklist

1. Merge the intended release state to `main`
2. Confirm the latest `CI` run on `main` succeeded
3. Confirm CodeQL is green in the GitHub UI
4. Start the `Release` workflow manually from GitHub Actions and provide the target version in `x.y.z` format

Optional local confidence check before starting the workflow:

```bash
npm run verify:full
```

If port `3015` is already occupied locally, keep the same one-pass gate and only override the Playwright port:

```bash
PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full
```

## What the Release Workflow Does

On a manual `workflow_dispatch` run against `main`, the workflow:

1. verifies the requested version is greater than the current `package.json` version
   or resumes a partially completed release when the requested version is already on `main`
2. verifies the latest `CI` run for the current `main` commit succeeded
3. bumps `package.json` and `package-lock.json` to the requested version
4. runs `prettier --check`, ESLint, and `tsc --noEmit`
5. runs unit/integration tests with coverage
6. builds the production bundle
7. verifies the packed npm artifact
8. runs the Playwright smoke suite
9. loads the SSH signing identity from 1Password and verifies the signing setup locally in the runner
10. creates and pushes the signed release commit and signed tag, with the release commit carrying `on-behalf-of: @roastcodes <github@roast.codes>`
11. publishes `@roastcodes/ttdash` to npm through Trusted Publishing
12. waits for npm registry propagation
13. verifies:
    - `npx --yes @roastcodes/ttdash@<version> --help`
    - `bunx @roastcodes/ttdash@<version> --help`

14. creates the GitHub release

Note: the workflow reruns the release-critical test suite itself after the version bump. This is necessary because the workflow-created push back to `main` should not be relied on to trigger the normal `CI` workflow again.
If a release fails after the version bump was already pushed, rerunning the workflow with the same version resumes that release only when all retry conditions still hold:

- `main` still points at the original `vX.Y.Z: Release` commit
- any pre-existing `vX.Y.Z` tag is already signed
- any pre-existing `vX.Y.Z` tag points at that same release commit

If new commits landed on `main` in the meantime, or an existing tag does not match the release commit, the workflow aborts early and you should cut a new version instead of retrying the old one.

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
