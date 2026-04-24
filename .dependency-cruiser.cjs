const productionPath = '^(src/|server/|shared/|server\\.js$|usage-normalizer\\.js$)'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-production',
      severity: 'error',
      comment: 'Production code must not participate in circular dependencies.',
      from: {
        path: productionPath,
      },
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans-src',
      severity: 'warn',
      comment:
        'Unreferenced modules in src/ are usually dead code or should be wired through an explicit entry point.',
      from: {
        orphan: true,
        path: '^src/',
        pathNot: [
          '^src/main\\.ts$',
          '^src/App\\.tsx$',
          '^src/types/index\\.ts$',
          '^src/hooks/use-dashboard-controller-types\\.ts$',
          '\\.d\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'no-production-to-tests',
      severity: 'error',
      comment: 'Production code must not import test modules or fixtures.',
      from: {
        path: productionPath,
      },
      to: {
        path: '^tests/',
      },
    },
    {
      name: 'no-src-to-server',
      severity: 'error',
      comment: 'Frontend code must not depend on server-only modules.',
      from: {
        path: '^src/',
      },
      to: {
        path: '^(server/|server\\.js$)',
      },
    },
    {
      name: 'no-server-to-src',
      severity: 'error',
      comment: 'Server code must not depend on frontend modules.',
      from: {
        path: '^(server/|server\\.js$)',
      },
      to: {
        path: '^src/',
      },
    },
    {
      name: 'no-dashboard-controller-fanout',
      severity: 'error',
      comment:
        'The dashboard controller should stay owned by the dashboard composition root instead of being consumed across component subtrees.',
      from: {
        path: '^src/components/',
        pathNot: '^src/components/Dashboard\\.tsx$',
      },
      to: {
        path: '^src/hooks/use-dashboard-controller\\.ts$',
      },
    },
    {
      name: 'no-dashboard-controller-internals-fanout',
      severity: 'error',
      comment:
        'Internal dashboard controller slices should stay behind the public controller hook instead of leaking into component code.',
      from: {
        path: '^src/components/',
      },
      to: {
        path: '^src/hooks/use-dashboard-controller-(?:actions|browser|derived-state|dialogs|drill-down|effects|shell-state|types)\\.ts$',
      },
    },
    {
      name: 'no-settings-modal-internals-fanout',
      severity: 'error',
      comment:
        'Settings modal internals should stay behind the settings feature shell instead of being reused across unrelated frontend modules.',
      from: {
        path: '^src/',
        pathNot:
          '^src/components/features/settings/(?:SettingsModal|SettingsModalSections|use-settings-modal-(?:draft|version-status)|settings-modal-helpers)\\.(?:ts|tsx)$',
      },
      to: {
        path: '^src/components/features/settings/(?:SettingsModalSections|use-settings-modal-(?:draft|version-status)|settings-modal-helpers)\\.(?:ts|tsx)$',
      },
    },
    {
      name: 'no-filterbar-internals-fanout',
      severity: 'error',
      comment:
        'FilterBar internals should stay behind the layout FilterBar shell instead of being reused across unrelated frontend modules.',
      from: {
        path: '^src/',
        pathNot:
          '^src/components/layout/(?:FilterBar|FilterBar(?:ChipFilters|DateRange|QuickControls|Status))\\.tsx$',
      },
      to: {
        path: '^src/components/layout/FilterBar(?:ChipFilters|DateRange|QuickControls|Status)\\.tsx$',
      },
    },
    {
      name: 'no-server-module-to-entrypoint',
      severity: 'error',
      comment: 'Server implementation modules must stay independent from the bootstrap entrypoint.',
      from: {
        path: '^server/',
      },
      to: {
        path: '^server\\.js$',
      },
    },
    {
      name: 'no-server-runtime-cross-imports',
      severity: 'error',
      comment:
        'Data, background, and auto-import runtimes must stay decoupled and be composed through dependency injection.',
      from: {
        path: '^server/(?:data|background|auto-import)-runtime\\.js$',
      },
      to: {
        path: '^server/(?:data|background|auto-import)-runtime\\.js$',
      },
    },
    {
      name: 'no-router-to-server-runtimes',
      severity: 'error',
      comment:
        'The HTTP router should depend on injected runtime APIs, not runtime implementations.',
      from: {
        path: '^server/http-router\\.js$',
      },
      to: {
        path: '^server/(?:data|background|auto-import)-runtime\\.js$',
      },
    },
    {
      name: 'no-server-runtimes-to-router',
      severity: 'error',
      comment: 'Server runtime modules must not depend back on the HTTP router.',
      from: {
        path: '^server/(?:data|background|auto-import)-runtime\\.js$',
      },
      to: {
        path: '^server/http-router\\.js$',
      },
    },
    {
      name: 'no-settings-contract-bypass',
      severity: 'error',
      comment:
        'Settings defaults and normalization must flow through shared/app-settings.js instead of raw dashboard config or frontend-only helpers.',
      from: {
        path: '^(server\\.js$|server/data-runtime\\.js$|src/lib/app-settings\\.ts$)',
      },
      to: {
        path: '^(shared/dashboard-preferences\\.json$|src/lib/dashboard-preferences\\.ts$|src/lib/provider-limits\\.ts$)',
      },
    },
    {
      name: 'no-raw-dashboard-preferences-imports',
      severity: 'error',
      comment:
        'Production code must consume dashboard preference rules through shared/dashboard-preferences.js instead of the raw JSON file.',
      from: {
        path: productionPath,
        pathNot: '^shared/dashboard-preferences\\.js$',
      },
      to: {
        path: '^shared/dashboard-preferences\\.json$',
      },
    },
    {
      name: 'no-shared-to-runtime',
      severity: 'error',
      comment: 'Shared runtime modules must stay neutral and not depend on app-specific layers.',
      from: {
        path: '^shared/',
      },
      to: {
        path: '^(src/|server/|server\\.js$|usage-normalizer\\.js$)',
      },
    },
    {
      name: 'no-usage-normalizer-to-app',
      severity: 'error',
      comment: 'The usage normalizer must stay independent from frontend and server modules.',
      from: {
        path: '^usage-normalizer\\.js$',
      },
      to: {
        path: '^(src/|server/|server\\.js$)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ['^node_modules'],
    },
    exclude: {
      path: [
        '^coverage/',
        '^dist/',
        '^playwright-report/',
        '^test-results/',
        '^\\.playwright-mcp/',
        '^\\.tmp-playwright/',
        '^\\.tmp-smoke-',
      ],
    },
    moduleSystems: ['es6', 'cjs'],
    tsConfig: {
      fileName: './tsconfig.json',
    },
    reporterOptions: {
      archi: {
        collapsePattern: '^(src/[^/]+|server/[^/]+|shared/[^/]+|server\\.js|usage-normalizer\\.js)',
      },
    },
  },
}
