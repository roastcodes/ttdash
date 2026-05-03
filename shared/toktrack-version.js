const packageJson = require('../package.json')

const TOKTRACK_PACKAGE_NAME = 'toktrack'
const EXACT_SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const TOKTRACK_VERSION = packageJson.dependencies?.[TOKTRACK_PACKAGE_NAME]

if (typeof TOKTRACK_VERSION !== 'string' || !EXACT_SEMVER_PATTERN.test(TOKTRACK_VERSION)) {
  throw new Error(
    `package.json dependencies.${TOKTRACK_PACKAGE_NAME} must be pinned to an exact SemVer version.`,
  )
}

const TOKTRACK_PACKAGE_SPEC = `${TOKTRACK_PACKAGE_NAME}@${TOKTRACK_VERSION}`

module.exports = {
  TOKTRACK_PACKAGE_NAME,
  TOKTRACK_VERSION,
  TOKTRACK_PACKAGE_SPEC,
}
