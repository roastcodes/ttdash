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
      'node_modules/**',
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
      'boundaries/elements': [
        {
          type: 'app-shell',
          pattern: 'src/App.tsx',
          mode: 'full',
        },
        {
          type: 'app-shell',
          pattern: 'src/main.tsx',
          mode: 'full',
        },
        {
          type: 'components',
          pattern: 'src/components/**/*',
          mode: 'full',
        },
        {
          type: 'hooks',
          pattern: 'src/hooks/**/*',
          mode: 'full',
        },
        {
          type: 'lib-react',
          pattern: 'src/lib/**/*.tsx',
          mode: 'full',
        },
        {
          type: 'lib-i18n',
          pattern: 'src/lib/i18n.ts',
          mode: 'full',
        },
        {
          type: 'lib-core',
          pattern: 'src/lib/**/*.ts',
          mode: 'full',
        },
        {
          type: 'types',
          pattern: 'src/types/**/*',
          mode: 'full',
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
          rules: [
            {
              from: { type: 'lib-react' },
              disallow: {
                to: { type: ['app-shell', 'components', 'hooks'] },
              },
            },
            {
              from: { type: 'lib-core' },
              disallow: {
                to: { type: ['app-shell', 'components', 'hooks', 'lib-react'] },
              },
            },
            {
              from: { type: 'lib-i18n' },
              disallow: {
                to: { type: ['app-shell', 'components', 'hooks', 'lib-react', 'lib-core'] },
              },
            },
            {
              from: { type: 'types' },
              disallow: {
                to: {
                  type: ['app-shell', 'components', 'hooks', 'lib-react', 'lib-core', 'lib-i18n'],
                },
              },
            },
            {
              from: { type: 'components' },
              disallow: {
                to: { type: ['app-shell'] },
              },
            },
            {
              from: { type: 'hooks' },
              disallow: {
                to: { type: ['app-shell', 'components'] },
              },
            },
            {
              from: { type: ['lib-core', 'types'] },
              disallow: {
                dependency: {
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
          ],
        },
      ],
      'boundaries/no-unknown': 'error',
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
    files: ['tests/e2e/**/*.ts'],
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
