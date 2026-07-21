#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_DIRS = ['docs-site/src', 'docs-site/public'];
const DEFAULT_DIST_DIR = 'docs-site/dist';
const DEFAULT_BASE_PATH = '/ttdash/';
const DEFAULT_MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.cjs',
  '.css',
  '.csv',
  '.html',
  '.htm',
  '.js',
  '.json',
  '.jsx',
  '.map',
  '.md',
  '.mdx',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.xml',
  '.yaml',
  '.yml',
]);
const PRIVATE_REFERENCE_PATTERNS = [
  {
    label: 'private security review directory',
    pattern: /(?:^|[^a-z0-9])docs[\\/]security(?:[\\/]|$)/i,
  },
  {
    label: 'private review directory',
    pattern: /(?:^|[^a-z0-9])docs[\\/]review(?:[\\/]|$)/i,
  },
  {
    label: 'application stack review',
    pattern: /application-stack-reference/i,
  },
  {
    label: 'penetration-test report',
    pattern: /(?:^|[\\/_.-])pentest(?:[\\/_.-]|$)/i,
  },
  {
    label: 'configuration review report',
    pattern: /(?:^|[\\/])config-review(?:[.\\/-]|$)/i,
  },
  {
    label: 'documentation review report',
    pattern: /(?:^|[\\/])documentation-review(?:[.\\/-]|$)/i,
  },
  {
    label: 'explicit private-document marker',
    pattern: /TTDASH_DOCS_PRIVATE/i,
  },
];

class PublicationVerificationError extends Error {
  constructor(errors) {
    super(
      `Documentation publication verification failed:\n${errors
        .map((error) => `- ${error}`)
        .join('\n')}`,
    );
    this.name = 'PublicationVerificationError';
    this.errors = errors;
  }
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function resolveInsideRepo(repoRoot, targetPath, label) {
  const resolved = path.resolve(repoRoot, targetPath);
  const relative = path.relative(repoRoot, resolved);

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the repository: ${targetPath}`);
  }

  return resolved;
}

function normalizeBasePath(basePath) {
  if (typeof basePath !== 'string' || !basePath.startsWith('/')) {
    throw new Error(`Pages base path must start with "/": ${basePath}`);
  }

  const normalized = `/${basePath.split('/').filter(Boolean).join('/')}/`;
  if (normalized === '//') return '/';
  return normalized;
}

function collectTreeEntries(rootPath) {
  if (!fs.existsSync(rootPath)) return [];

  const entries = [];

  function visit(absolutePath, relativePath) {
    const stat = fs.lstatSync(absolutePath);
    const normalizedRelativePath = toPosixPath(relativePath || '.');

    entries.push({
      absolutePath,
      relativePath: normalizedRelativePath,
      stat,
    });

    if (!stat.isDirectory() || stat.isSymbolicLink()) return;

    for (const childName of fs.readdirSync(absolutePath).sort()) {
      visit(
        path.join(absolutePath, childName),
        relativePath ? path.join(relativePath, childName) : childName,
      );
    }
  }

  visit(rootPath, '');
  return entries;
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function findPrivateReferences(value) {
  return PRIVATE_REFERENCE_PATTERNS.filter(({ pattern }) => pattern.test(value)).map(
    ({ label }) => label,
  );
}

function readTextForInspection(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Could not inspect ${filePath}: ${error.message}`);
  }
}

function inspectEntriesForPublication(entries, displayRoot, errors) {
  const files = [];

  for (const entry of entries) {
    const displayPath = toPosixPath(path.join(displayRoot, entry.relativePath));

    if (entry.stat.isSymbolicLink()) {
      errors.push(`${displayPath} is a symbolic link; publication sources must be regular files`);
      continue;
    }

    const pathMatches = findPrivateReferences(displayPath);
    for (const match of pathMatches) {
      errors.push(`${displayPath} matches blocked ${match}`);
    }

    if (!entry.stat.isFile()) continue;
    files.push(entry);

    if (!isTextFile(entry.absolutePath)) continue;

    const content = readTextForInspection(entry.absolutePath);
    const contentMatches = findPrivateReferences(content);
    for (const match of contentMatches) {
      errors.push(`${displayPath} contains a reference to blocked ${match}`);
    }
  }

  return files;
}

function runGit(repoRoot, args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: options.encoding || 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listTrackedFiles(repoRoot, sourcePaths) {
  const output = runGit(repoRoot, ['ls-files', '-z', '--', ...sourcePaths], {
    encoding: 'buffer',
  });

  return new Set(
    output
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((filePath) => toPosixPath(filePath)),
  );
}

function isGitIgnored(repoRoot, relativePath) {
  const result = spawnSync('git', ['check-ignore', '--no-index', '--quiet', '--', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status === 0) return true;
  if (result.status === 1) return false;

  const detail = (result.stderr || result.stdout || '').trim();
  throw new Error(
    `Could not check gitignore status for ${relativePath}${detail ? `: ${detail}` : ''}`,
  );
}

function verifyPublicSources(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const requestedSourceDirs = options.sourceDirs || DEFAULT_SOURCE_DIRS;
  const sourceDirs = requestedSourceDirs
    .map((sourceDir) => resolveInsideRepo(repoRoot, sourceDir, 'Public source directory'))
    .filter((sourceDir) => fs.existsSync(sourceDir));
  const requiredSourceDir = resolveInsideRepo(
    repoRoot,
    options.requiredSourceDir || 'docs-site/src',
    'Required public source directory',
  );
  const errors = [];

  if (!fs.existsSync(requiredSourceDir)) {
    errors.push(
      `${toPosixPath(path.relative(repoRoot, requiredSourceDir))} is missing; no documentation source can be published`,
    );
  }

  if (sourceDirs.length === 0) {
    errors.push('No public documentation source directories exist');
    throw new PublicationVerificationError(errors);
  }

  const relativeSourceDirs = sourceDirs.map((sourceDir) =>
    toPosixPath(path.relative(repoRoot, sourceDir)),
  );
  let trackedFiles;

  try {
    trackedFiles = listTrackedFiles(repoRoot, relativeSourceDirs);
  } catch (error) {
    errors.push(`Could not inspect tracked documentation sources: ${error.message}`);
    throw new PublicationVerificationError(errors);
  }

  let fileCount = 0;

  for (let index = 0; index < sourceDirs.length; index += 1) {
    const sourceDir = sourceDirs[index];
    const displayRoot = relativeSourceDirs[index];
    const entries = collectTreeEntries(sourceDir);
    const files = inspectEntriesForPublication(entries, displayRoot, errors);
    fileCount += files.length;

    for (const file of files) {
      const repoRelativePath = toPosixPath(path.relative(repoRoot, file.absolutePath));

      if (!trackedFiles.has(repoRelativePath)) {
        errors.push(`${repoRelativePath} is not tracked by git`);
      }

      try {
        if (isGitIgnored(repoRoot, repoRelativePath)) {
          errors.push(`${repoRelativePath} is matched by .gitignore`);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  if (fileCount === 0) {
    errors.push('Public documentation source directories contain no files');
  }

  if (errors.length > 0) {
    throw new PublicationVerificationError(errors);
  }

  return {
    fileCount,
    sourceDirs: relativeSourceDirs,
  };
}

function extractRootRelativeUrls(html) {
  const urls = [];
  const attributePattern = /\b(action|href|poster|src|srcset)\s*=\s*["']([^"']*)["']/gi;
  let match;

  while ((match = attributePattern.exec(html)) !== null) {
    const values =
      match[1].toLowerCase() === 'srcset'
        ? match[2].split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0])
        : [match[2]];

    for (const value of values) {
      if (/^\/(?!\/)/.test(value)) urls.push(value);
    }
  }

  const cssUrlPattern = /url\(\s*(["']?)(\/(?!\/)[^"')\s]+)\1\s*\)/gi;
  while ((match = cssUrlPattern.exec(html)) !== null) {
    urls.push(match[2]);
  }

  const metaRefreshPattern =
    /<meta\b(?=[^>]*\bhttp-equiv\s*=\s*["']?refresh["']?)[^>]*\bcontent\s*=\s*["'][^"']*\burl\s*=\s*(\/(?!\/)[^;"'\s>]+)[^"']*["'][^>]*>/gi;
  while ((match = metaRefreshPattern.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

function urlUsesBasePath(rawUrl, basePath) {
  const pathname = rawUrl.split(/[?#]/, 1)[0];
  if (basePath === '/') return pathname.startsWith('/');

  const baseWithoutTrailingSlash = basePath.slice(0, -1);
  return pathname === baseWithoutTrailingSlash || pathname.startsWith(basePath);
}

function verifyBuiltArtifact(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const distDir = resolveInsideRepo(
    repoRoot,
    options.distDir || DEFAULT_DIST_DIR,
    'Documentation artifact directory',
  );
  const displayRoot = toPosixPath(path.relative(repoRoot, distDir));
  const basePath = normalizeBasePath(options.basePath || DEFAULT_BASE_PATH);
  const maxArtifactBytes = Number(
    options.maxArtifactBytes === undefined ? DEFAULT_MAX_ARTIFACT_BYTES : options.maxArtifactBytes,
  );
  const errors = [];

  if (!Number.isFinite(maxArtifactBytes) || maxArtifactBytes <= 0) {
    throw new Error(`Maximum artifact size must be a positive number: ${maxArtifactBytes}`);
  }

  if (!fs.existsSync(distDir)) {
    throw new PublicationVerificationError([`${displayRoot} does not exist; build the docs first`]);
  }

  const entries = collectTreeEntries(distDir);
  const files = inspectEntriesForPublication(entries, displayRoot, errors);
  const relativeFiles = new Set(files.map((file) => file.relativePath));
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.stat.size;
  }

  for (const requiredPath of ['index.html', '404.html', 'pagefind/pagefind.js']) {
    if (!relativeFiles.has(requiredPath)) {
      errors.push(`${displayRoot}/${requiredPath} is missing from the Pages artifact`);
    }
  }

  const hasPagefindIndex = files.some(
    (file) =>
      file.relativePath.startsWith('pagefind/') &&
      (file.relativePath.endsWith('.pf_index') ||
        file.relativePath.endsWith('.pf_fragment') ||
        file.relativePath === 'pagefind/pagefind-entry.json'),
  );
  if (!hasPagefindIndex) {
    errors.push(`${displayRoot}/pagefind does not contain a generated search index`);
  }

  let basePathReferenceCount = 0;
  for (const file of files.filter((candidate) => /\.(?:css|html)$/i.test(candidate.relativePath))) {
    const content = readTextForInspection(file.absolutePath);
    const urls = extractRootRelativeUrls(content);

    for (const url of urls) {
      if (urlUsesBasePath(url, basePath)) {
        basePathReferenceCount += 1;
      } else {
        errors.push(
          `${displayRoot}/${file.relativePath} contains root-relative URL outside ${basePath}: ${url}`,
        );
      }
    }
  }

  if (basePath !== '/' && basePathReferenceCount === 0) {
    errors.push(`${displayRoot} contains no root-relative URLs using the Pages base ${basePath}`);
  }

  if (files.length === 0 || totalBytes === 0) {
    errors.push(`${displayRoot} is empty`);
  } else if (totalBytes > maxArtifactBytes) {
    errors.push(
      `${displayRoot} is ${totalBytes} bytes, exceeding the ${maxArtifactBytes}-byte publication limit`,
    );
  }

  if (errors.length > 0) {
    throw new PublicationVerificationError(errors);
  }

  return {
    basePath,
    fileCount: files.length,
    totalBytes,
  };
}

function verifyDocsPublication(options = {}) {
  return {
    artifact: verifyBuiltArtifact(options),
    sources: verifyPublicSources(options),
  };
}

function parseArgs(argv) {
  const options = { sourceDirs: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === '--source' && value) {
      options.sourceDirs.push(value);
      index += 1;
    } else if (argument === '--dist' && value) {
      options.distDir = value;
      index += 1;
    } else if (argument === '--base' && value) {
      options.basePath = value;
      index += 1;
    } else if (argument === '--max-bytes' && value) {
      options.maxArtifactBytes = Number(value);
      index += 1;
    } else if (argument === '--repo-root' && value) {
      options.repoRoot = value;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  if (options.sourceDirs.length === 0) delete options.sourceDirs;
  return options;
}

function main(argv = process.argv.slice(2)) {
  const result = verifyDocsPublication(parseArgs(argv));
  process.stdout.write(
    `Verified ${result.sources.fileCount} public source files and ${result.artifact.fileCount} built files (${result.artifact.totalBytes} bytes) for ${result.artifact.basePath}.\n`,
  );
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_BASE_PATH,
  DEFAULT_DIST_DIR,
  DEFAULT_MAX_ARTIFACT_BYTES,
  DEFAULT_SOURCE_DIRS,
  PRIVATE_REFERENCE_PATTERNS,
  PublicationVerificationError,
  collectTreeEntries,
  extractRootRelativeUrls,
  findPrivateReferences,
  isGitIgnored,
  listTrackedFiles,
  main,
  normalizeBasePath,
  parseArgs,
  urlUsesBasePath,
  verifyBuiltArtifact,
  verifyDocsPublication,
  verifyPublicSources,
};
