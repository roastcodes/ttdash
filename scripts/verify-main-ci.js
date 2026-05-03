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
    requiredJob: null,
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

    if (arg === '--required-job' && next) {
      options.requiredJob = next;
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
      'Usage: node scripts/verify-main-ci.js --repo <owner/repo> --workflow <file> --sha <commit> [--branch main] [--required-job <name>] [--retries N] [--retry-delay-ms MS]',
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

async function fetchWorkflowRunJobs(options, token, runId) {
  const jobs = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${options.repo}/actions/runs/${runId}/jobs`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

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

    const payload = await response.json();
    if (!Array.isArray(payload.jobs)) {
      return jobs;
    }

    jobs.push(...payload.jobs);

    if (payload.jobs.length < 100) {
      return jobs;
    }

    page += 1;
  }
}

function describeRun(run) {
  return `${run.name} (${run.status}/${run.conclusion ?? 'pending'})`;
}

function describeJob(job) {
  return `${job.name} (${job.status}/${job.conclusion ?? 'pending'})`;
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
    } else if (options.requiredJob) {
      const jobs = await fetchWorkflowRunJobs(options, token, run.id);
      const job = jobs.find((candidate) => candidate.name === options.requiredJob);

      if (!job) {
        const jobNames = jobs
          .map((candidate) => candidate.name)
          .sort()
          .join(', ');
        fail(
          `Required CI job "${options.requiredJob}" was not found in workflow run ${run.id} for ${options.sha}. Available jobs: ${jobNames || 'none'}.`,
        );
      } else if (job.status !== 'completed') {
        log(
          `Required CI job is still in progress: ${describeJob(job)} (attempt ${attempt}/${options.retries}).`,
        );
      } else if (job.conclusion === 'success') {
        log(`Verified required CI job for ${options.sha}: ${describeJob(job)}.`);
        return;
      } else {
        fail(
          `Required CI job "${options.requiredJob}" for ${options.sha} completed with ${job.conclusion}. Release aborted.`,
        );
      }
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

  if (options.requiredJob) {
    fail(
      `Required CI job "${options.requiredJob}" for ${options.sha} did not reach a successful conclusion in time.`,
    );
  }

  fail(`CI workflow for ${options.sha} did not reach a successful conclusion in time.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
