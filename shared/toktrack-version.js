const semver = require('semver')
const packageJson = require('../package.json')

const TOKTRACK_PACKAGE_NAME = 'toktrack'
const TOKTRACK_VERSION = packageJson.dependencies?.[TOKTRACK_PACKAGE_NAME]

if (typeof TOKTRACK_VERSION !== 'string' || semver.valid(TOKTRACK_VERSION) !== TOKTRACK_VERSION) {
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
