import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import packageJson from '../../package.json'

const scripts = packageJson.scripts as Record<string, string>

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
      'npm run format:check && npm run lint && npm run check:deps && npm run typecheck',
    )
    expect(scripts['test:static']).not.toContain('lint:docstrings')
    expect(scripts.lint).toContain('--cache-location .cache/eslint/full')
    expect(scripts.lint).toContain('--cache-strategy content')
    expect(scripts['lint:docstrings']).toContain('--cache-location .cache/eslint/docstrings')
    expect(scripts.format).toContain('--cache-location .cache/prettier/write')
    expect(scripts['format:check']).toContain('--cache-location .cache/prettier/check')
    expect(scripts.typecheck).toContain('--tsBuildInfoFile .cache/tsc/tsconfig.tsbuildinfo')
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

    for (const job of [
      'static',
      'vitest',
      'coverage',
      'build',
      'package-smoke',
      'e2e',
      'windows-smoke',
      'ci-required',
    ]) {
      expect(workflow).toContain(`\n  ${job}:`)
    }

    expect(workflow).toContain('run: npm run test:static')
    expect(workflow).toContain('run: npm run test:vitest:${{ matrix.project }}')
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
    expect(workflow).toContain(
      'check_result "windows-smoke" "${{ needs[\'windows-smoke\'].result }}"',
    )
    expect(workflow).toContain('uses: actions/download-artifact@')
  })

  it('uses the required CI job as the release gate', async () => {
    const releaseWorkflow = await readFile('.github/workflows/release.yml', 'utf8')
    const verifyScript = await readFile('scripts/verify-main-ci.js', 'utf8')

    expect(releaseWorkflow).toContain('--workflow ci.yml')
    expect(releaseWorkflow).toContain('--required-job "CI Required"')
    expect(verifyScript).toContain('--required-job')
    expect(verifyScript).toContain('/actions/runs/${runId}/jobs')
    expect(verifyScript).toContain('Required CI job')
  })
})
