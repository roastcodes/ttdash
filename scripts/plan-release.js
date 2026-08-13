#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { appendFileSync, readFileSync } = require('node:fs');

const DEFAULT_QUIET_HOURS = 2;
const DEPENDABOT_LOGIN = 'dependabot[bot]';
const EXPECTED_REPOSITORY = 'roastcodes/ttdash';
const ALLOWED_REQUEST_ORIGINS = new Set(['https://api.github.com', 'https://registry.npmjs.org']);
const GITHUB_PULLS_URL =
  'https://api.github.com/repos/roastcodes/ttdash/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/roastcodes/ttdash/releases?per_page=100';
const GITHUB_MERGE_GROUP_RUNS_URL =
  'https://api.github.com/repos/roastcodes/ttdash/actions/workflows/ci.yml/runs?event=merge_group&per_page=100';
const NPM_PACKAGE_METADATA_URL = 'https://registry.npmjs.org/%40roastcodes%2Fttdash';
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(message);
}

function parseVersion(value) {
  const match = SEMVER_PATTERN.exec(value ?? '');
  if (!match) {
    fail(`Release version must use x.y.z format. Received: ${value ?? '<empty>'}`);
  }

  return match.slice(1).map((part) => Number.parseInt(part, 10));
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

function nextPatchVersion(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

function decideAutomaticRelease({
  currentVersion,
  releaseCommitSha,
  releaseComplete,
  headSha,
  headCommittedAt,
  now,
  quietHours = DEFAULT_QUIET_HOURS,
  unpublishedCommits,
}) {
  if (!releaseComplete) {
    return {
      shouldRelease: true,
      shouldBump: false,
      version: currentVersion,
      targetSha: releaseCommitSha,
      reason: 'retry_incomplete_release',
    };
  }

  if (headSha === releaseCommitSha || unpublishedCommits.length === 0) {
    return {
      shouldRelease: false,
      shouldBump: false,
      version: currentVersion,
      targetSha: headSha,
      reason: 'no_unreleased_changes',
    };
  }

  const nonDependabotCommits = unpublishedCommits.filter(
    (commit) =>
      commit.pullRequests.length !== 1 ||
      commit.pullRequests[0].author !== DEPENDABOT_LOGIN ||
      commit.pullRequests[0].mergeCommitSha !== commit.sha,
  );

  if (nonDependabotCommits.length > 0) {
    return {
      shouldRelease: false,
      shouldBump: false,
      version: currentVersion,
      targetSha: headSha,
      reason: 'non_dependabot_changes',
      blockingCommits: nonDependabotCommits.map((commit) => commit.sha),
    };
  }

  const quietPeriodMs = quietHours * 60 * 60 * 1000;
  const headAgeMs = now.getTime() - new Date(headCommittedAt).getTime();
  if (!Number.isFinite(headAgeMs) || headAgeMs < quietPeriodMs) {
    return {
      shouldRelease: false,
      shouldBump: false,
      version: currentVersion,
      targetSha: headSha,
      reason: 'quiet_period',
    };
  }

  return {
    shouldRelease: true,
    shouldBump: true,
    version: nextPatchVersion(currentVersion),
    targetSha: headSha,
    reason: 'automatic_patch',
  };
}

function decideManualRelease({ currentVersion, requestedVersion, headSha, releaseCommitSha }) {
  const comparison = compareVersions(requestedVersion, currentVersion);
  if (comparison < 0) {
    fail(
      `Release version ${requestedVersion} must not be lower than current package version ${currentVersion}.`,
    );
  }

  if (comparison === 0) {
    if (!releaseCommitSha) {
      fail(`Could not locate the original release commit for ${requestedVersion} on main.`);
    }

    return {
      shouldRelease: true,
      shouldBump: false,
      version: requestedVersion,
      targetSha: releaseCommitSha,
      reason: 'manual_retry',
    };
  }

  return {
    shouldRelease: true,
    shouldBump: true,
    version: requestedVersion,
    targetSha: headSha,
    reason: 'manual_release',
  };
}

function parseArgs(argv) {
  const options = {
    mode: null,
    repo: null,
    requestedVersion: null,
    quietHours: DEFAULT_QUIET_HOURS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--mode' && next) {
      options.mode = next;
      index += 1;
      continue;
    }

    if (arg === '--repo' && next) {
      options.repo = next;
      index += 1;
      continue;
    }

    if (arg === '--requested-version' && next) {
      options.requestedVersion = next;
      index += 1;
      continue;
    }

    if (arg === '--quiet-hours' && next) {
      options.quietHours = Number.parseFloat(next);
      index += 1;
    }
  }

  if (!['automatic', 'manual'].includes(options.mode) || !options.repo) {
    fail(
      'Usage: node scripts/plan-release.js --mode <automatic|manual> --repo <owner/repo> [--requested-version x.y.z] [--quiet-hours N]',
    );
  }

  if (options.repo !== EXPECTED_REPOSITORY) {
    fail(`Release planning is restricted to ${EXPECTED_REPOSITORY}. Received: ${options.repo}`);
  }

  if (options.mode === 'manual' && !options.requestedVersion) {
    fail('--requested-version is required in manual mode.');
  }

  if (!Number.isFinite(options.quietHours) || options.quietHours < 0) {
    fail(`Invalid quiet hours value: ${options.quietHours}`);
  }

  return options;
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function findReleaseCommit(version) {
  const expectedSubject = `v${version}: Release`;
  const log = runGit(['log', '--first-parent', '--format=%H%x00%s', 'HEAD']);

  for (const line of log.split('\n')) {
    const [sha, subject] = line.split('\0');
    if (subject === expectedSubject) return sha;
  }

  return null;
}

function resolveTagCommit(tag) {
  try {
    return runGit(['rev-parse', `${tag}^{commit}`]);
  } catch {
    return null;
  }
}

function listFirstParentCommits(baseSha, headSha) {
  if (baseSha === headSha) return [];

  const log = runGit([
    'log',
    '--first-parent',
    '--format=%H%x00%cI%x00%s',
    `${baseSha}..${headSha}`,
  ]);
  if (!log) return [];

  return log.split('\n').map((line) => {
    const [sha, committedAt, subject] = line.split('\0');
    return { sha, committedAt, subject, pullRequests: [] };
  });
}

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

function createAllowedRequestUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_REQUEST_ORIGINS.has(url.origin)) {
    fail(`Release planning cannot request untrusted origin ${url.origin}.`);
  }

  return url;
}

async function requestJson(url, token, { accept = 'application/json' } = {}) {
  const requestUrl = createAllowedRequestUrl(url);
  // lgtm[js/file-access-to-http] Only validated release metadata is sent to fixed, allowlisted APIs.
  const response = await fetch(requestUrl, {
    headers: {
      Accept: accept,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ttdash-release-planner',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Request to ${requestUrl.origin} failed with status ${response.status}.`);
  }

  return response.json();
}

async function releaseExists(tag, token) {
  for (let page = 1; ; page += 1) {
    const url = new URL(GITHUB_RELEASES_URL);
    url.searchParams.set('page', String(page));
    const payload = await requestJson(url, token, { accept: 'application/vnd.github+json' });

    if (!Array.isArray(payload)) {
      fail('GitHub returned an invalid releases response.');
    }

    if (payload.some((release) => release.tag_name === tag)) return true;
    if (payload.length < 100) return false;
  }
}

function hasNpmVersion(payload, version) {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    payload.versions === null ||
    typeof payload.versions !== 'object' ||
    Array.isArray(payload.versions)
  ) {
    fail('npm returned an invalid package metadata response.');
  }

  return Object.hasOwn(payload.versions, version);
}

async function npmVersionExists(version) {
  const payload = await requestJson(NPM_PACKAGE_METADATA_URL, null);
  return hasNpmVersion(payload, version);
}

async function fetchAllMergedPullRequests(token) {
  const pullRequests = [];

  for (let page = 1; ; page += 1) {
    const url = new URL(GITHUB_PULLS_URL);
    url.searchParams.set('page', String(page));
    const payload = await requestJson(url, token, { accept: 'application/vnd.github+json' });

    if (!Array.isArray(payload)) {
      fail('GitHub returned an invalid pull request response.');
    }

    pullRequests.push(
      ...payload
        .filter((pullRequest) => pullRequest.merged_at && pullRequest.base?.ref === 'main')
        .map((pullRequest) => ({
          number: pullRequest.number,
          author: pullRequest.user?.login ?? null,
          mergeCommitSha: pullRequest.merge_commit_sha,
          url: pullRequest.html_url,
        })),
    );

    if (payload.length < 100) return pullRequests;
  }
}

async function fetchAllMergeGroupRuns(token) {
  const runs = [];

  for (let page = 1; ; page += 1) {
    const url = new URL(GITHUB_MERGE_GROUP_RUNS_URL);
    url.searchParams.set('page', String(page));
    const payload = await requestJson(url, token, { accept: 'application/vnd.github+json' });

    if (!Array.isArray(payload.workflow_runs)) {
      fail('GitHub returned an invalid merge-group workflow response.');
    }

    runs.push(...payload.workflow_runs);
    if (payload.workflow_runs.length < 100) return runs;
  }
}

function findMergeGroupShas(commits, runs) {
  const mergeGroupShas = [];

  for (const commit of commits) {
    for (const pullRequest of commit.pullRequests) {
      if (!Number.isSafeInteger(pullRequest.number) || pullRequest.number <= 0) {
        fail('GitHub returned an invalid pull request number.');
      }

      const expectedBranchPrefix = `gh-readonly-queue/main/pr-${pullRequest.number}-`;
      const matchingRuns = runs
        .filter(
          (run) =>
            run.head_branch?.startsWith(expectedBranchPrefix) &&
            run.status === 'completed' &&
            run.conclusion === 'success' &&
            SHA_PATTERN.test(run.head_sha ?? ''),
        )
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
      const exactRun = matchingRuns.find((run) => run.head_sha === commit.sha);
      const selectedRun = exactRun ?? matchingRuns[0];

      if (!selectedRun) {
        fail(
          `Could not find a successful merge-queue CI run for Dependabot PR #${pullRequest.number}.`,
        );
      }

      mergeGroupShas.push(selectedRun.head_sha);
    }
  }

  return [...new Set(mergeGroupShas)];
}

function writeOutputs(plan) {
  const outputs = {
    should_release: String(plan.shouldRelease),
    should_bump: String(plan.shouldBump),
    version: plan.version,
    target_sha: plan.targetSha,
    merge_group_shas: (plan.mergeGroupShas ?? []).join(','),
    reason: plan.reason,
  };

  if (process.env.GITHUB_OUTPUT) {
    for (const [key, value] of Object.entries(outputs)) {
      appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
  } else {
    process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`);
  }
}

function writeSummary({ mode, plan, currentVersion, commits = [], releaseState = null }) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;

  const lines = [
    '# Release plan',
    '',
    `- Mode: \`${mode}\``,
    `- Decision: \`${plan.reason}\``,
    `- Current version: \`${currentVersion}\``,
    `- Planned version: \`${plan.version}\``,
    `- Target commit: \`${plan.targetSha}\``,
    `- Merge-group commits: \`${(plan.mergeGroupShas ?? []).join(', ') || 'none'}\``,
    `- Release job: \`${plan.shouldRelease ? 'run' : 'skip'}\``,
  ];

  if (releaseState) {
    lines.push(
      `- Current tag valid: \`${releaseState.tagMatches}\``,
      `- npm publication exists: \`${releaseState.npmPublished}\``,
      `- GitHub release exists: \`${releaseState.githubRelease}\``,
    );
  }

  if (commits.length > 0) {
    lines.push('', '## Unreleased first-parent commits', '');
    for (const commit of commits) {
      const pullRequests = commit.pullRequests
        .map((pullRequest) => `#${pullRequest.number} by ${pullRequest.author}`)
        .join(', ');
      lines.push(`- \`${commit.sha.slice(0, 12)}\` ${commit.subject} — ${pullRequests || 'no PR'}`);
    }
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

async function createPlan(options) {
  const currentVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
  parseVersion(currentVersion);

  const headSha = runGit(['rev-parse', 'HEAD']);
  const releaseCommitSha = findReleaseCommit(currentVersion);

  if (options.mode === 'manual') {
    const plan = decideManualRelease({
      currentVersion,
      requestedVersion: options.requestedVersion,
      headSha,
      releaseCommitSha,
    });
    return { plan, currentVersion };
  }

  const token = getToken();
  if (!token) fail('GITHUB_TOKEN or GH_TOKEN is required in automatic mode.');
  if (!releaseCommitSha) {
    fail(`Could not locate release commit v${currentVersion}: Release on main.`);
  }

  const tag = `v${currentVersion}`;
  const tagCommitSha = resolveTagCommit(tag);
  if (tagCommitSha && tagCommitSha !== releaseCommitSha) {
    fail(`Tag ${tag} does not point to release commit ${releaseCommitSha}.`);
  }

  const [npmPublished, githubRelease] = await Promise.all([
    npmVersionExists(currentVersion),
    releaseExists(tag, token),
  ]);
  const releaseState = {
    tagMatches: tagCommitSha === releaseCommitSha,
    npmPublished,
    githubRelease,
  };
  const releaseComplete = Object.values(releaseState).every(Boolean);

  let commits = [];
  if (releaseComplete) {
    commits = listFirstParentCommits(releaseCommitSha, headSha);
    const mergedPullRequests = await fetchAllMergedPullRequests(token);
    for (const commit of commits) {
      commit.pullRequests = mergedPullRequests.filter(
        (pullRequest) => pullRequest.mergeCommitSha === commit.sha,
      );
    }
  }

  const headCommittedAt = runGit(['show', '-s', '--format=%cI', headSha]);
  const plan = decideAutomaticRelease({
    currentVersion,
    releaseCommitSha,
    releaseComplete,
    headSha,
    headCommittedAt,
    now: new Date(),
    quietHours: options.quietHours,
    unpublishedCommits: commits,
  });

  if (plan.shouldBump && plan.reason === 'automatic_patch') {
    const mergeGroupRuns = await fetchAllMergeGroupRuns(token);
    plan.mergeGroupShas = findMergeGroupShas(commits, mergeGroupRuns);
  }

  return { plan, currentVersion, commits, releaseState };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await createPlan(options);
  writeOutputs(result.plan);
  writeSummary({ mode: options.mode, ...result });
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  compareVersions,
  createAllowedRequestUrl,
  decideAutomaticRelease,
  decideManualRelease,
  findMergeGroupShas,
  hasNpmVersion,
  nextPatchVersion,
  parseVersion,
  requestJson,
};
