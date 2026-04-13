#!/usr/bin/env node

const DEFAULT_RETRIES = 30;
const DEFAULT_RETRY_DELAY_MS = 10000;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function parseArgs(argv) {
  const options = {
    repo: null,
    workflow: null,
    branch: 'main',
    sha: null,
    retries: DEFAULT_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--repo' && next) {
      options.repo = next;
      index += 1;
      continue;
    }

    if (arg === '--workflow' && next) {
      options.workflow = next;
      index += 1;
      continue;
    }

    if (arg === '--branch' && next) {
      options.branch = next;
      index += 1;
      continue;
    }

    if (arg === '--sha' && next) {
      options.sha = next;
      index += 1;
      continue;
    }

    if (arg === '--retries' && next) {
      options.retries = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--retry-delay-ms' && next) {
      options.retryDelayMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
  }

  if (!options.repo || !options.workflow || !options.sha) {
    fail(
      'Usage: node scripts/verify-main-ci.js --repo <owner/repo> --workflow <file> --sha <commit> [--branch main] [--retries N] [--retry-delay-ms MS]',
    );
  }

  if (!Number.isInteger(options.retries) || options.retries <= 0) {
    fail(`Invalid retries value: ${options.retries}`);
  }

  if (!Number.isInteger(options.retryDelayMs) || options.retryDelayMs < 0) {
    fail(`Invalid retry delay value: ${options.retryDelayMs}`);
  }

  return options;
}

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWorkflowRuns(options, token) {
  const url = new URL(
    `https://api.github.com/repos/${options.repo}/actions/workflows/${encodeURIComponent(options.workflow)}/runs`,
  );
  url.searchParams.set('branch', options.branch);
  url.searchParams.set('event', 'push');
  url.searchParams.set('per_page', '30');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ttdash-release-workflow',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const normalizedBody = body.replace(/\s+/g, ' ').trim();
    const maxPreviewLength = 200;
    const bodyPreview =
      normalizedBody.length > maxPreviewLength
        ? `${normalizedBody.slice(0, maxPreviewLength)}…`
        : normalizedBody;
    const previewSuffix = bodyPreview ? ` Response preview: ${bodyPreview}` : '';
    throw new Error(`GitHub API request failed with ${response.status}.${previewSuffix}`);
  }

  return response.json();
}

function describeRun(run) {
  return `${run.name} (${run.status}/${run.conclusion ?? 'pending'})`;
}

async function main() {
  const token = getToken();
  if (!token) {
    fail('GITHUB_TOKEN or GH_TOKEN is required.');
  }

  const options = parseArgs(process.argv.slice(2));

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    const payload = await fetchWorkflowRuns(options, token);
    const run = payload.workflow_runs.find((candidate) => candidate.head_sha === options.sha);

    if (!run) {
      log(
        `CI workflow run for ${options.sha} not found yet (attempt ${attempt}/${options.retries}).`,
      );
    } else if (run.status !== 'completed') {
      log(
        `CI workflow run is still in progress: ${describeRun(run)} (attempt ${attempt}/${options.retries}).`,
      );
    } else if (run.conclusion === 'success') {
      log(`Verified CI success for ${options.sha}: ${describeRun(run)}.`);
      return;
    } else {
      fail(`CI workflow for ${options.sha} completed with ${run.conclusion}. Release aborted.`);
    }

    if (attempt < options.retries) {
      await sleep(options.retryDelayMs);
    }
  }

  fail(`CI workflow for ${options.sha} did not reach a successful conclusion in time.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
