import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  compareVersions,
  createAllowedRequestUrl,
  decideAutomaticRelease,
  decideManualRelease,
  nextPatchVersion,
  parseVersion,
} = require('../../scripts/plan-release.js') as {
  compareVersions: (left: string, right: string) => number
  createAllowedRequestUrl: (value: string) => URL
  decideAutomaticRelease: (input: AutomaticReleaseInput) => ReleasePlan
  decideManualRelease: (input: ManualReleaseInput) => ReleasePlan
  nextPatchVersion: (version: string) => string
  parseVersion: (version: string) => number[]
}

type PullRequest = {
  author: string
  mergeCommitSha: string
  number: number
}

type UnpublishedCommit = {
  pullRequests: PullRequest[]
  sha: string
}

type AutomaticReleaseInput = {
  currentVersion: string
  headCommittedAt: string
  headSha: string
  now: Date
  quietHours?: number
  releaseCommitSha: string
  releaseComplete: boolean
  unpublishedCommits: UnpublishedCommit[]
}

type ManualReleaseInput = {
  currentVersion: string
  headSha: string
  releaseCommitSha: string | null
  requestedVersion: string
}

type ReleasePlan = {
  blockingCommits?: string[]
  reason: string
  shouldBump: boolean
  shouldRelease: boolean
  targetSha: string
  version: string
}

const releaseSha = '1'.repeat(40)
const headSha = '2'.repeat(40)

function dependabotCommit(sha = headSha): UnpublishedCommit {
  return {
    sha,
    pullRequests: [
      {
        author: 'dependabot[bot]',
        mergeCommitSha: sha,
        number: 123,
      },
    ],
  }
}

function automaticInput(overrides: Partial<AutomaticReleaseInput> = {}): AutomaticReleaseInput {
  return {
    currentVersion: '6.3.15',
    releaseCommitSha: releaseSha,
    releaseComplete: true,
    headSha,
    headCommittedAt: '2026-08-13T09:00:00.000Z',
    now: new Date('2026-08-13T12:30:00.000Z'),
    quietHours: 2,
    unpublishedCommits: [dependabotCommit()],
    ...overrides,
  }
}

describe('release planning', () => {
  it('restricts release metadata requests to the GitHub and npm APIs', () => {
    expect(createAllowedRequestUrl('https://api.github.com/repos/roastcodes/ttdash').origin).toBe(
      'https://api.github.com',
    )
    expect(
      createAllowedRequestUrl('https://registry.npmjs.org/%40roastcodes%2Fttdash/6.3.15').origin,
    ).toBe('https://registry.npmjs.org')
    expect(() => createAllowedRequestUrl('http://api.github.com/repos/roastcodes/ttdash')).toThrow(
      'untrusted origin',
    )
    expect(() => createAllowedRequestUrl('https://example.com/private')).toThrow('untrusted origin')
  })

  it('parses, compares, and increments strict release versions', () => {
    expect(parseVersion('6.3.15')).toEqual([6, 3, 15])
    expect(compareVersions('6.4.0', '6.3.15')).toBe(1)
    expect(compareVersions('6.3.15', '6.3.15')).toBe(0)
    expect(compareVersions('6.3.14', '6.3.15')).toBe(-1)
    expect(nextPatchVersion('6.3.15')).toBe('6.3.16')
    expect(() => parseVersion('v6.3.15')).toThrow('x.y.z')
  })

  it('creates one patch for multiple successfully merged Dependabot PRs', () => {
    const secondSha = '3'.repeat(40)
    const plan = decideAutomaticRelease(
      automaticInput({
        unpublishedCommits: [dependabotCommit(headSha), dependabotCommit(secondSha)],
      }),
    )

    expect(plan).toMatchObject({
      shouldRelease: true,
      shouldBump: true,
      version: '6.3.16',
      targetSha: headSha,
      reason: 'automatic_patch',
    })
  })

  it('does not require open or failed Dependabot PRs to be part of the release', () => {
    const plan = decideAutomaticRelease(
      automaticInput({ unpublishedCommits: [dependabotCommit()] }),
    )

    expect(plan.reason).toBe('automatic_patch')
    expect(plan.shouldRelease).toBe(true)
  })

  it('does nothing when main has not changed since the complete release', () => {
    const plan = decideAutomaticRelease(
      automaticInput({
        headSha: releaseSha,
        unpublishedCommits: [],
      }),
    )

    expect(plan).toMatchObject({
      shouldRelease: false,
      shouldBump: false,
      version: '6.3.15',
      reason: 'no_unreleased_changes',
    })
  })

  it('stops automatic patch classification for human PRs or direct commits', () => {
    const humanSha = '4'.repeat(40)
    const plan = decideAutomaticRelease(
      automaticInput({
        unpublishedCommits: [
          dependabotCommit(),
          {
            sha: humanSha,
            pullRequests: [{ author: 'maintainer', mergeCommitSha: humanSha, number: 124 }],
          },
        ],
      }),
    )

    expect(plan).toMatchObject({
      shouldRelease: false,
      reason: 'non_dependabot_changes',
      blockingCommits: [humanSha],
    })
  })

  it('waits until main has been quiet for two hours', () => {
    const plan = decideAutomaticRelease(
      automaticInput({ headCommittedAt: '2026-08-13T11:30:01.000Z' }),
    )

    expect(plan).toMatchObject({
      shouldRelease: false,
      reason: 'quiet_period',
    })
  })

  it('retries an incomplete current release before considering later commits', () => {
    const plan = decideAutomaticRelease(
      automaticInput({
        releaseComplete: false,
        unpublishedCommits: [{ sha: headSha, pullRequests: [] }],
      }),
    )

    expect(plan).toMatchObject({
      shouldRelease: true,
      shouldBump: false,
      version: '6.3.15',
      targetSha: releaseSha,
      reason: 'retry_incomplete_release',
    })
  })

  it('preserves manual releases and can retry an older release commit', () => {
    expect(
      decideManualRelease({
        currentVersion: '6.3.15',
        requestedVersion: '6.4.0',
        headSha,
        releaseCommitSha: releaseSha,
      }),
    ).toMatchObject({
      shouldBump: true,
      targetSha: headSha,
      reason: 'manual_release',
    })

    expect(
      decideManualRelease({
        currentVersion: '6.3.15',
        requestedVersion: '6.3.15',
        headSha,
        releaseCommitSha: releaseSha,
      }),
    ).toMatchObject({
      shouldBump: false,
      targetSha: releaseSha,
      reason: 'manual_retry',
    })

    expect(() =>
      decideManualRelease({
        currentVersion: '6.3.15',
        requestedVersion: '6.3.14',
        headSha,
        releaseCommitSha: releaseSha,
      }),
    ).toThrow('must not be lower')
  })
})
