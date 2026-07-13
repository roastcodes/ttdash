#!/usr/bin/env node

const { execFileSync } = require('child_process');
const path = require('path');
const semver = require('semver');

const packageJson = require('../package.json');
const packageLock = require('../package-lock.json');
const toolingTypeScript = require('typescript');
const toolingPackage = require('typescript/package.json');
const nativePackage = require('@typescript/native/package.json');

const nativePackagePath = require.resolve('@typescript/native/package.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const toolingSpec = packageJson.devDependencies?.typescript;
const nativeSpec = packageJson.devDependencies?.['@typescript/native'];

assert(
  typeof toolingSpec === 'string' && semver.validRange(toolingSpec),
  'devDependencies.typescript must contain a valid semver range.',
);
assert(
  typeof nativeSpec === 'string' && /^npm:typescript@\^7\./.test(nativeSpec),
  'devDependencies.@typescript/native must provide the TypeScript 7 compiler.',
);

const expectedToolingVersion = packageLock.packages?.['node_modules/typescript']?.version;
const expectedNativeVersion = packageLock.packages?.['node_modules/@typescript/native']?.version;

assert(
  toolingPackage.name === 'typescript',
  'The tooling API must use the real TypeScript package.',
);
assert(
  semver.satisfies(toolingPackage.version, toolingSpec),
  `The installed tooling TypeScript ${toolingPackage.version} does not satisfy ${toolingSpec}.`,
);
// typescript-eslint supports TypeScript >=4.8.4 <6.1.0, so 6.1.x would break linting.
assert(
  semver.satisfies(toolingPackage.version, '>=6.0.3 <6.1.0'),
  'The tooling TypeScript API must remain within the supported 6.0.x range.',
);
assert(
  toolingTypeScript.version === toolingPackage.version,
  'The TypeScript API and package manifest versions must match.',
);
assert(
  toolingTypeScript.version === expectedToolingVersion,
  `The installed tooling TypeScript ${toolingTypeScript.version} does not match package-lock.json ${expectedToolingVersion}.`,
);
assert(
  typeof toolingTypeScript.createProgram === 'function',
  'The tooling TypeScript package must expose createProgram().',
);
assert(
  nativePackage.name === 'typescript',
  'The native compiler alias must resolve to TypeScript.',
);
assert(
  semver.satisfies(nativePackage.version, nativeSpec.slice('npm:typescript@'.length)),
  `The installed native TypeScript ${nativePackage.version} does not satisfy ${nativeSpec}.`,
);
// Keep the separately invoked compiler on TypeScript 7 while the tooling API remains on 6.0.x.
assert(
  semver.satisfies(nativePackage.version, '>=7 <8'),
  'The native TypeScript compiler must be version 7.x.',
);
assert(
  nativePackage.version === expectedNativeVersion,
  `The installed native TypeScript ${nativePackage.version} does not match package-lock.json ${expectedNativeVersion}.`,
);

const nativeTscRelativePath =
  typeof nativePackage.bin === 'string' ? nativePackage.bin : nativePackage.bin?.tsc;
assert(typeof nativeTscRelativePath === 'string', 'The native TypeScript package must expose tsc.');

const nativeTscPath = path.resolve(path.dirname(nativePackagePath), nativeTscRelativePath);
const compilerVersion = execFileSync(process.execPath, [nativeTscPath, '--version'], {
  encoding: 'utf8',
}).trim();

assert(
  compilerVersion === `Version ${nativePackage.version}`,
  `Expected the TypeScript ${nativePackage.version} compiler, received "${compilerVersion}".`,
);

process.stdout.write(
  `TypeScript tooling API ${toolingTypeScript.version}; compiler ${nativePackage.version}\n`,
);
