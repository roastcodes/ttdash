import { readFileSync } from 'node:fs'

import { unified } from '@astrojs/markdown-remark'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'

import focusableExpressiveCode from './src/plugins/expressive-code-focusable-blocks.mjs'
import focusableScrollRegions from './src/plugins/rehype-focusable-scroll-regions.mjs'

const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export default defineConfig({
  site: 'https://roastcodes.github.io',
  base: '/ttdash',
  output: 'static',
  markdown: {
    processor: unified({
      rehypePlugins: [focusableScrollRegions],
    }),
  },
  integrations: [
    starlight({
      title: 'TTDash',
      description: 'Local-first analytics for toktrack usage data.',
      favicon: '/favicon.svg',
      logo: {
        src: './src/assets/ttdash-logo.svg',
        alt: '',
      },
      customCss: ['./src/styles/custom.css'],
      expressiveCode: {
        plugins: [focusableExpressiveCode],
      },
      components: {
        MobileMenuToggle: './src/components/MobileMenuToggle.astro',
      },
      plugins: [starlightLinksValidator()],
      social: [
        {
          icon: 'github',
          label: 'TTDash on GitHub',
          href: 'https://github.com/roastcodes/ttdash',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/roastcodes/ttdash/edit/main/docs-site/',
      },
      lastUpdated: true,
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/ttdash/favicon.png',
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:type', content: 'website' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://roastcodes.github.io/ttdash/screenshots/ttdash-dashboard.png',
          },
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0c0e12' },
        },
        {
          tag: 'meta',
          attrs: { name: 'ttdash-version', content: rootPackage.version },
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started' },
            { label: 'Importing data', slug: 'getting-started/importing-data' },
          ],
        },
        {
          label: 'Using TTDash',
          items: [
            { label: 'Dashboard & filters', slug: 'guides/dashboard' },
            { label: 'Exports & backups', slug: 'guides/exports-backups' },
            { label: 'Troubleshooting', slug: 'guides/troubleshooting' },
          ],
        },
        {
          label: 'Deploying',
          items: [
            { label: 'Configuration & CLI', slug: 'deploying/configuration' },
            { label: 'Remote access & security', slug: 'deploying/remote-access' },
            { label: 'Docker', slug: 'deploying/docker' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Data formats', slug: 'reference/data-formats' },
            { label: 'HTTP API', slug: 'reference/http-api' },
          ],
        },
        {
          label: 'Contributing',
          items: [
            { label: 'Architecture', slug: 'contributing/architecture' },
            { label: 'Testing', slug: 'contributing/testing' },
            {
              label: 'Contributor guide',
              link: 'https://github.com/roastcodes/ttdash/blob/main/CONTRIBUTING.md',
              attrs: { target: '_blank' },
            },
            {
              label: 'Security policy',
              link: 'https://github.com/roastcodes/ttdash/security/policy',
              attrs: { target: '_blank' },
            },
            {
              label: 'Releases',
              link: 'https://github.com/roastcodes/ttdash/releases',
              attrs: { target: '_blank' },
            },
          ],
        },
      ],
    }),
  ],
})
