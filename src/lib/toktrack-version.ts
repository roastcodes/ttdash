import {
  TOKTRACK_PACKAGE_NAME as SHARED_TOKTRACK_PACKAGE_NAME,
  TOKTRACK_PACKAGE_SPEC as SHARED_TOKTRACK_PACKAGE_SPEC,
  TOKTRACK_VERSION as SHARED_TOKTRACK_VERSION,
} from '../../shared/toktrack-version.js'

/** Canonical npm package name used for toktrack lookups and execution. */
export const TOKTRACK_PACKAGE_NAME = SHARED_TOKTRACK_PACKAGE_NAME
/** Pinned toktrack version validated by TTDash. */
export const TOKTRACK_VERSION = SHARED_TOKTRACK_VERSION
/** Fully qualified toktrack package spec used by npm and bun executors. */
export const TOKTRACK_PACKAGE_SPEC = SHARED_TOKTRACK_PACKAGE_SPEC
