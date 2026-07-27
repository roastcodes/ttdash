import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importPlugin from 'eslint-plugin-import-x'
import jestDom from 'eslint-plugin-jest-dom'
import jsdoc from 'eslint-plugin-jsdoc'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import playwright from 'eslint-plugin-playwright'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import testingLibrary from 'eslint-plugin-testing-library'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'docs-site/.astro/**',
      'docs-site/dist/**',
      'docs-site/node_modules/**',
      'node_modules/**',
      'playwright-docs-report/**',
      'playwright-report/**',
      'test-results/**',
      '.playwright-mcp/**',
      '.tmp-playwright/**',
      '.tmp-smoke-*/**',
    ],
  },
  {
    files: ['**/*.{js,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.mjs'],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      'no-undef': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeCheckedOnly],
    plugins: {
      boundaries,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/files-single-match': true,
      'boundaries/files': [
        {
          category: 'app-shell',
          pattern: ['src/App.tsx', 'src/main.tsx'],
        },
        {
          category: 'components',
          pattern: 'src/components/**/*.{ts,tsx}',
        },
        {
          category: 'hooks',
          pattern: 'src/hooks/**/*.{ts,tsx}',
        },
        {
          category: 'lib-i18n',
          pattern: 'src/lib/i18n.ts',
        },
        {
          category: 'lib-react',
          pattern: 'src/lib/**/*.tsx',
        },
        {
          category: 'lib-core',
          pattern: 'src/lib/**/*.ts',
        },
        {
          category: 'types',
          pattern: 'src/types/**/*.{ts,tsx}',
        },
      ],
    },
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          checkAllOrigins: true,
          policies: [
            {
              from: { file: { categories: 'lib-react' } },
              disallow: {
                to: { file: { categories: ['app-shell', 'components', 'hooks'] } },
              },
            },
            {
              from: { file: { categories: 'lib-core' } },
              disallow: {
                to: {
                  file: { categories: ['app-shell', 'components', 'hooks', 'lib-react'] },
                },
              },
            },
            {
              from: { file: { categories: 'lib-i18n' } },
              disallow: {
                to: {
                  file: {
                    categories: ['app-shell', 'components', 'hooks', 'lib-react', 'lib-core'],
                  },
                },
              },
            },
            {
              from: { file: { categories: 'types' } },
              disallow: {
                to: {
                  file: {
                    categories: [
                      'app-shell',
                      'components',
                      'hooks',
                      'lib-react',
                      'lib-core',
                      'lib-i18n',
                    ],
                  },
                },
              },
            },
            {
              from: { file: { categories: 'components' } },
              disallow: {
                to: { file: { categories: ['app-shell'] } },
              },
            },
            {
              from: { file: { categories: 'hooks' } },
              disallow: {
                to: { file: { categories: ['app-shell', 'components'] } },
              },
            },
            {
              from: { file: { categories: ['lib-core', 'types'] } },
              disallow: {
                to: {
                  module: {
                    origin: 'external',
                    source: [
                      'react',
                      'react-dom',
                      'react-i18next',
                      'framer-motion',
                      'recharts',
                      'lucide-react',
                      '@radix-ui/*',
                      '@tanstack/react-query',
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/no-unknown-files': 'error',
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    extends: [react.configs.flat.recommended, react.configs.flat['jsx-runtime']],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    extends: [jsxA11y.flatConfigs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ['tests/frontend/**/*.test.tsx'],
    extends: [testingLibrary.configs['flat/react'], jestDom.configs['flat/recommended']],
    rules: {
      'testing-library/no-container': 'off',
      'testing-library/no-node-access': 'off',
    },
  },
  {
    files: ['tests/e2e/**/*.ts', 'tests/docs-e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    languageOptions: {
      ecmaVersion: 'latest',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      'import-x/export': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-unresolved': 'error',
    },
  },
  {
    files: ['docs-site/astro.config.mjs'],
    rules: {
      // The documentation package owns these dependencies and validates them
      // through Astro after its isolated install. Root-only lint jobs must not
      // require docs-site/node_modules just to lint the configuration files.
      'import-x/no-unresolved': [
        'error',
        {
          ignore: [
            '^@astrojs/markdown-remark$',
            '^@astrojs/starlight$',
            '^astro/config$',
            '^starlight-links-validator$',
          ],
        },
      ],
    },
  },
  {
    files: ['docs-site/src/content.config.ts'],
    rules: {
      // Astro supplies its virtual content module, while Starlight is owned by
      // the independently installed documentation package.
      'import-x/no-unresolved': [
        'error',
        {
          ignore: [
            '^@astrojs/starlight/loaders$',
            '^@astrojs/starlight/schema$',
            '^astro:content$',
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.d.ts'],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
    rules: {
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-property-names': 'error',
      'jsdoc/check-syntax': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/empty-tags': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-description': [
        'error',
        {
          checkConstructors: false,
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'FunctionDeclaration',
            'VariableDeclaration',
            'ClassDeclaration',
          ],
          descriptionStyle: 'body',
        },
      ],
      'jsdoc/require-description-complete-sentence': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          checkConstructors: false,
          checkGetters: false,
          checkSetters: false,
          contexts: [
            'ExportNamedDeclaration > TSInterfaceDeclaration',
            'ExportNamedDeclaration > TSTypeAliasDeclaration',
            'ExportNamedDeclaration > VariableDeclaration',
          ],
          publicOnly: {
            ancestorsOnly: true,
            esm: true,
          },
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: false,
          },
        },
      ],
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/sort-tags': 'error',
    },
  },
  {
    files: ['shared/**/*.js', 'server/**/*.js', 'server.js', 'usage-normalizer.js'],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
    rules: {
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-property-names': 'error',
      'jsdoc/check-syntax': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/empty-tags': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-description': [
        'error',
        {
          checkConstructors: false,
          contexts: ['FunctionDeclaration', 'VariableDeclaration'],
          descriptionStyle: 'body',
        },
      ],
      'jsdoc/require-description-complete-sentence': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          checkConstructors: false,
          checkGetters: false,
          checkSetters: false,
          contexts: ['ExportNamedDeclaration > VariableDeclaration'],
          publicOnly: {
            ancestorsOnly: true,
            cjs: true,
            esm: true,
          },
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: false,
          },
        },
      ],
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/sort-tags': 'error',
    },
  },
  eslintConfigPrettier,
)
