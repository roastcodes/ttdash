import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import packageJson from '../../package.json'

const scripts = packageJson.scripts as Record<string, string>

function getWorkflowJobBlock(workflow: string, jobName: string) {
  const lines = workflow.split('\n')
  const startIndex = lines.findIndex((line) => line === `  ${jobName}:`)

  expect(startIndex, `${jobName} workflow job`).toBeGreaterThanOrEqual(0)

  const nextJobIndex = lines.findIndex(
    (line, index) => index > startIndex && /^  [a-zA-Z0-9_-]+:$/.test(line),
  )

  return lines.slice(startIndex, nextJobIndex === -1 ? lines.length : nextJobIndex).join('\n')
}

function getDependabotUpdateBlock(config: string, ecosystem: string, directory = '/') {
  const lines = config.split('\n')
  const startIndexes = lines.flatMap((line, index) =>
    line.startsWith('  - package-ecosystem: ') ? [index] : [],
  )
  const updateBlocks = startIndexes.map((startIndex, index) =>
    lines.slice(startIndex, startIndexes[index + 1] ?? lines.length).join('\n'),
  )
  const updateBlock = updateBlocks.find(
    (block) =>
      block.startsWith(`  - package-ecosystem: '${ecosystem}'`) &&
      block.includes(`directory: '${directory}'`),
  )

  expect(updateBlock, `${ecosystem} Dependabot update entry for ${directory}`).toBeDefined()

  return updateBlock as string
}

describe('test pipeline scripts', () => {
  it('exposes local gates that map to the CI test layers', () => {
    expect(scripts.check).toBe('npm run test:static')
    expect(scripts.test).toBe('npm run test:vitest')
    expect(scripts['test:vitest']).toBe('npm run test:architecture && npm run test:unit')
    expect(scripts['test:vitest:coverage']).toBe('npm run test:unit:coverage')
    expect(scripts['test:e2e']).toBe('npm run test:e2e:parallel')
    expect(scripts['test:timings:budget']).toContain('--max-suite-seconds=20')
    expect(scripts['test:timings:budget']).toContain('--max-test-seconds=12')
    expect(scripts['test:timings:projects']).toBe('node scripts/run-vitest-project-timings.js')
    expect(scripts['test:timings:benchmark']).toBe(
      'node scripts/run-vitest-project-timings.js --repeat=3',
    )
    expect(scripts['verify:parallel']).toBe('node scripts/run-parallel-gate.js')
    expect(scripts['verify:full:parallel']).toBe('node scripts/run-parallel-gate.js --e2e')
    expect(scripts['verify:ci']).toBe('npm run verify:release && npm run test:e2e:ci')
    expect(scripts['verify:full']).toBe('npm run verify:ci')
  })

  it('keeps the static gate cached and avoids a duplicate docstring lint pass', () => {
    expect(scripts['test:static']).toBe(
      'npm run format:check && npm run lint && npm run check:deps && npm run verify:typescript-toolchain && npm run typecheck',
    )
    expect(scripts['test:static']).not.toContain('lint:docstrings')
    expect(scripts.lint).toContain('--cache-location .cache/eslint/full')
    expect(scripts.lint).toContain('--cache-strategy content')
    expect(scripts['lint:docstrings']).toContain('--cache-location .cache/eslint/docstrings')
    expect(scripts.format).toContain('--cache-location .cache/prettier/write')
    expect(scripts['format:check']).toContain('--cache-location .cache/prettier/check')
    expect(scripts.typecheck).toContain('--tsBuildInfoFile .cache/tsc/tsconfig.tsbuildinfo')
    expect(scripts.typecheck).toContain('./node_modules/@typescript/native/bin/tsc')
    expect(scripts['verify:typescript-toolchain']).toBe(
      'node scripts/verify-typescript-toolchain.js',
    )
  })

  it('enables the JUnit reporter whenever a Vitest script writes JUnit output', () => {
    const scriptsWithJunitOutput = Object.entries(scripts).filter(([, command]) =>
      command.includes('--outputFile.junit'),
    )

    expect(scriptsWithJunitOutput.length).toBeGreaterThan(0)
    for (const [scriptName, command] of scriptsWithJunitOutput) {
      expect(command, scriptName).toContain('--reporter=junit')
    }
  })

  it('keeps CI split into parallel jobs that share one production bundle artifact', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const windowsSmokeBlock = workflow.slice(
      workflow.indexOf('\n  windows-smoke:'),
      workflow.indexOf('\n  bun-toolchain:'),
    )

    for (const job of [
      'static',
      'vitest',
      'coverage',
      'build',
      'package-smoke',
      'e2e',
      'windows-smoke',
      'bun-toolchain',
      'ci-required',
    ]) {
      expect(workflow).toContain(`\n  ${job}:`)
    }

    expect(workflow).toContain('run: npm run test:static')
    expect(workflow).toContain('PROJECT: ${{ matrix.project }}')
    expect(workflow).toContain('run: npm run "test:vitest:${PROJECT}"')
    expect(workflow).toContain('node scripts/report-test-timings.js')
    expect(workflow).toContain('--max-suite-seconds=20')
    expect(workflow).toContain('--max-test-seconds=12')
    expect(workflow).toContain('run: npm run test:vitest:coverage')
    expect(workflow).toContain('name: production-dist')
    expect(workflow).toContain('package-smoke:')
    expect(workflow).toContain('e2e:')
    expect(workflow).toContain('needs: build')
    expect(workflow).toContain('name: CI Required')
    expect(workflow).toContain('if: ${{ always() }}')
    expect(workflow).toContain('- static')
    expect(workflow).toContain('- vitest')
    expect(workflow).toContain('- coverage')
    expect(workflow).toContain('- package-smoke')
    expect(workflow).toContain('- e2e')
    expect(workflow).toContain('- windows-smoke')
    expect(workflow).toContain('- bun-toolchain')
    expect(workflow).toContain("WINDOWS_SMOKE_RESULT: ${{ needs['windows-smoke'].result }}")
    expect(workflow).toContain("BUN_TOOLCHAIN_RESULT: ${{ needs['bun-toolchain'].result }}")
    expect(workflow).toContain('check_result "windows-smoke" "${WINDOWS_SMOKE_RESULT}"')
    expect(workflow).toContain('check_result "bun-toolchain" "${BUN_TOOLCHAIN_RESULT}"')
    expect(workflow).toContain('bun install --frozen-lockfile --ignore-scripts')
    expect(workflow).toContain('run: bun run verify:typescript-toolchain')
    expect(workflow).toContain('run: bun run lint')
    expect(workflow).toContain('run: bun run typecheck')
    expect(workflow).toContain('run: bun run test:architecture')
    expect(workflow).toContain('run: bun run build:app')
    expect(workflow).toContain('bun-version-file: .bun-version')
    expect(windowsSmokeBlock).toContain('run: npm run typecheck')
    expect(workflow).toContain('uses: actions/download-artifact@')
  })

  it('keeps documentation verification in required CI and deploys only the tested main commit', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const pagesWorkflow = await readFile('.github/workflows/pages.yml', 'utf8')
    const documentationBlock = getWorkflowJobBlock(workflow, 'documentation')
    const requiredBlock = getWorkflowJobBlock(workflow, 'ci-required')
    const publishBlock = getWorkflowJobBlock(workflow, 'publish-documentation')
    const pagesBuildBlock = getWorkflowJobBlock(pagesWorkflow, 'build')
    const pagesDeployBlock = getWorkflowJobBlock(pagesWorkflow, 'deploy')
    const verifiedArtifactBlock = documentationBlock.slice(
      documentationBlock.indexOf('- name: Upload verified documentation site'),
      documentationBlock.indexOf('- name: Upload documentation test reports'),
    )

    expect(scripts['docs:verify']).toContain('node scripts/verify-docs-publication.js')
    expect(scripts['test:docs:e2e']).toBe('npm run docs:build && npm run test:docs:e2e:built')
    expect(documentationBlock).toContain('run: npm run docs:verify')
    expect(documentationBlock).toContain('run: npm run test:docs:e2e:built')
    expect(documentationBlock).toContain('name: documentation-site')
    expect(documentationBlock).toContain('name: documentation-test-reports')
    expect(verifiedArtifactBlock).not.toContain('if: always()')
    expect(requiredBlock).toContain('- documentation')
    expect(requiredBlock).toContain('DOCUMENTATION_RESULT: ${{ needs.documentation.result }}')
    expect(requiredBlock).toContain('check_result "documentation" "${DOCUMENTATION_RESULT}"')
    expect(publishBlock).toContain('needs: ci-required')
    expect(publishBlock).toContain("github.event_name == 'push'")
    expect(publishBlock).toContain("github.ref == 'refs/heads/main'")
    expect(publishBlock).toContain('uses: ./.github/workflows/pages.yml')

    expect(pagesWorkflow).toContain('workflow_call:')
    expect(pagesWorkflow).toContain('workflow_dispatch:')
    expect(pagesWorkflow).not.toContain('inputs:')
    expect(pagesBuildBlock).toContain("if: github.ref == 'refs/heads/main'")
    expect(pagesBuildBlock).toContain('ref: ${{ github.sha }}')
    expect(pagesBuildBlock).toContain('name: Verify exact main commit passed required CI')
    expect(pagesBuildBlock).toContain('--sha "${{ github.sha }}"')
    expect(pagesBuildBlock).toContain('--required-job "CI Required"')
    expect(pagesBuildBlock).toContain('actions: read')
    expect(pagesBuildBlock).toContain('run: npm run docs:verify')
    expect(pagesBuildBlock).toContain('run: npm run test:docs:e2e:built')
    expect(pagesBuildBlock).toContain('path: docs-site/dist')
    expect(pagesDeployBlock).toContain('pages: write')
    expect(pagesDeployBlock).toContain('id-token: write')
    expect(pagesWorkflow).toContain('group: pages')
    expect(pagesWorkflow).toContain('cancel-in-progress: false')
  })

  it('keeps release and scheduled link checks aligned with the public documentation boundary', async () => {
    const releaseWorkflow = await readFile('.github/workflows/release.yml', 'utf8')
    const linksWorkflow = await readFile('.github/workflows/docs-links.yml', 'utf8')
    const releaseBlock = getWorkflowJobBlock(releaseWorkflow, 'release')
    const linksBlock = getWorkflowJobBlock(linksWorkflow, 'links')

    expect(releaseBlock).toContain('run: npm run docs:install')
    expect(releaseBlock).toContain('run: npm run docs:verify')
    expect(releaseBlock).toContain('run: npm run test:docs:e2e:built')

    expect(linksWorkflow).toContain('schedule:')
    expect(linksWorkflow).toContain('workflow_dispatch:')
    expect(linksBlock).toContain('GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}')
    expect(linksBlock).toContain("--exclude '^file://'")
    expect(linksBlock).toContain("'docs-site/src/content/docs/**/*.md'")
    expect(linksBlock).toContain("'docs-site/src/content/docs/**/*.mdx'")
    expect(linksBlock).not.toContain("'docs/")
  })

  it('uses the required CI job as the release gate', async () => {
    const releaseWorkflow = await readFile('.github/workflows/release.yml', 'utf8')
    const verifyScript = await readFile('scripts/verify-main-ci.js', 'utf8')
    const bunVersion = (await readFile('.bun-version', 'utf8')).trim()
    const releaseBlock = getWorkflowJobBlock(releaseWorkflow, 'release')

    expect(releaseBlock).toContain('--workflow ci.yml')
    expect(releaseBlock).toContain('--required-job "CI Required"')
    expect(releaseBlock).toContain('run: npm run typecheck')
    expect(releaseBlock).toContain('run: npm run verify:typescript-toolchain')
    expect(releaseBlock).toContain('bun-version-file: .bun-version')
    expect(bunVersion).toBe('1.3.14')
    expect(verifyScript).toContain('--required-job')
    expect(verifyScript).toContain('/actions/runs/${runId}/jobs')
    expect(verifyScript).toContain('Required CI job')
  })

  it('keeps Dependabot npm and Bun updates in one lockfile-aware group', async () => {
    const config = await readFile('.github/dependabot.yml', 'utf8')
    const groupBlock = config.slice(
      config.indexOf('multi-ecosystem-groups:'),
      config.indexOf('\nupdates:'),
    )

    expect(groupBlock).toContain('javascript-dependencies:')
    expect(groupBlock).toContain('schedule:')
    expect(groupBlock).toContain("target-branch: 'main'")
    expect(groupBlock).toContain('open-pull-requests-limit: 5')
    expect(groupBlock).toContain('commit-message:')
    expect(groupBlock).toContain('pull-request-branch-name:')

    for (const ecosystem of ['npm', 'bun']) {
      const updateBlock = getDependabotUpdateBlock(config, ecosystem)

      expect(updateBlock).toContain("directory: '/'")
      expect(updateBlock).toContain("multi-ecosystem-group: 'javascript-dependencies'")
      expect(updateBlock).toContain("patterns:\n      - '*'")
      expect(updateBlock).toContain("versioning-strategy: 'increase-if-necessary'")
      expect(updateBlock).not.toContain('open-pull-requests-limit:')
      expect(updateBlock).not.toContain('target-branch:')
      expect(updateBlock).not.toContain('commit-message:')
      expect(updateBlock).not.toContain('pull-request-branch-name:')
      expect(updateBlock).toContain("dependency-name: 'typescript'")
      expect(updateBlock).toContain("versions:\n          - '>=6.1.0'")
      expect(updateBlock).toContain("dependency-name: '@typescript/native'")
    }

    expect(config.match(/multi-ecosystem-group: 'javascript-dependencies'/g)).toHaveLength(2)
    expect(config.match(/dependency-name: 'typescript'/g)).toHaveLength(3)
    expect(config.match(/dependency-name: '@typescript\/native'/g)).toHaveLength(2)
    const docsUpdateBlock = getDependabotUpdateBlock(config, 'npm', '/docs-site')

    expect(docsUpdateBlock).toContain("directory: '/docs-site'")
    expect(docsUpdateBlock).toContain("prefix: 'deps(docs)'")
    expect(docsUpdateBlock).toContain("dependency-name: 'typescript'")
    expect(docsUpdateBlock).toContain("versions:\n          - '>=7.0.0'")
  })
})
