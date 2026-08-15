import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { fetchWorkflowRuns, findRequiredJob, parseArgs, requestGitHubApi, selectLatestWorkflowRun } =
  require('../../scripts/verify-main-ci.js') as {
    fetchWorkflowRuns: (
      options: Record<string, string | boolean>,
      token: string,
    ) => Promise<Array<Record<string, unknown>>>
    findRequiredJob: (
      jobs: Array<{ id: number; name: string }>,
      requiredJob: string,
    ) => { id: number; name: string } | undefined
    parseArgs: (args: string[]) => {
      branch: string
      event: string
      repo: string
      sha: string
      workflow: string
    }
    requestGitHubApi: (url: string | URL, token: string) => Promise<unknown>
    selectLatestWorkflowRun: (
      runs: Array<Record<string, string | number>>,
      sha: string,
    ) => Record<string, string | number> | undefined
  }

const sha = 'a'.repeat(40)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('main CI verification', () => {
  it('accepts only the repository, workflows, events, branch, and SHA used by the release pipeline', () => {
    expect(
      parseArgs([
        '--repo',
        'roastcodes/ttdash',
        '--workflow',
        'ci.yml',
        '--event',
        'merge_group',
        '--no-branch-filter',
        '--sha',
        sha,
      ]),
    ).toMatchObject({ repo: 'roastcodes/ttdash', workflow: 'ci.yml', event: 'merge_group', sha })

    expect(() => parseArgs(['--repo', 'other/repo', '--workflow', 'ci.yml', '--sha', sha])).toThrow(
      'restricted to roastcodes/ttdash',
    )
    expect(() =>
      parseArgs(['--repo', 'roastcodes/ttdash', '--workflow', 'other.yml', '--sha', sha]),
    ).toThrow('does not allow workflow')
    expect(() =>
      parseArgs(['--repo', 'roastcodes/ttdash', '--workflow', 'ci.yml', '--sha', 'main']),
    ).toThrow('Invalid commit SHA')
  })

  it('selects the newest exact workflow run deterministically', () => {
    const selected = selectLatestWorkflowRun(
      [
        { id: 10, head_sha: sha, created_at: '2026-08-13T10:00:00Z', run_attempt: 1 },
        { id: 11, head_sha: 'b'.repeat(40), created_at: '2026-08-13T12:00:00Z' },
        { id: 12, head_sha: sha, created_at: '2026-08-13T11:00:00Z', run_attempt: 1 },
      ],
      sha,
    )

    expect(selected?.id).toBe(12)
  })

  it('uses the newest retry when timestamps match', () => {
    const createdAt = '2026-08-13T10:00:00Z'
    const selected = selectLatestWorkflowRun(
      [
        { id: 10, head_sha: sha, created_at: createdAt, run_attempt: 1 },
        { id: 10, head_sha: sha, created_at: createdAt, run_attempt: 2 },
      ],
      sha,
    )

    expect(selected?.run_attempt).toBe(2)
  })

  it('uses the larger run ID when timestamps and retries match', () => {
    const createdAt = '2026-08-13T10:00:00Z'
    const selected = selectLatestWorkflowRun(
      [
        { id: 10, head_sha: sha, created_at: createdAt, run_attempt: 1 },
        { id: 11, head_sha: sha, created_at: createdAt, run_attempt: 1 },
      ],
      sha,
    )

    expect(selected?.id).toBe(11)
  })

  it('matches required jobs by id or exact name and rejects malformed run responses', async () => {
    const jobs = [{ id: 42, name: 'CI Required' }]
    expect(findRequiredJob(jobs, '42')).toEqual(jobs[0])
    expect(findRequiredJob(jobs, 'CI Required')).toEqual(jobs[0])
    expect(findRequiredJob(jobs, 'Missing')).toBeUndefined()

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ unexpected: [] }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }),
        ),
      ),
    )

    await expect(
      fetchWorkflowRuns(
        {
          branch: 'main',
          event: 'push',
          repo: 'roastcodes/ttdash',
          sha,
          useBranchFilter: true,
          workflow: 'ci.yml',
        },
        'token',
      ),
    ).rejects.toThrow('invalid workflow-runs response')
  })

  it('rejects untrusted API origins and redirects', async () => {
    await expect(requestGitHubApi('https://example.com/private', 'token')).rejects.toThrow(
      'untrusted origin',
    )

    const fetchMock = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.redirect).toBe('error')
      return Promise.reject(new TypeError('redirect rejected'))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      requestGitHubApi('https://api.github.com/repos/roastcodes/ttdash', 'token'),
    ).rejects.toThrow('redirect rejected')
  })
})
