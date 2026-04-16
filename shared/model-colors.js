const MODEL_COLOR_FAMILIES = [
  {
    id: 'opencode',
    light: { h: 192, s: 76, l: 40 },
    dark: { h: 192, s: 82, l: 58 },
    resolve(name) {
      return /^OpenCode$/i.test(name)
        ? {
            bucketKey: 'opencode',
            version: null,
          }
        : null
    },
  },
  {
    id: 'codex',
    light: { h: 194, s: 72, l: 38 },
    dark: { h: 194, s: 78, l: 55 },
    resolve(name) {
      return /^Codex(?: .+)?$/i.test(name)
        ? {
            bucketKey: 'codex',
            version: null,
          }
        : null
    },
  },
  {
    id: 'gpt-codex',
    light: { h: 194, s: 76, l: 42 },
    dark: { h: 194, s: 82, l: 60 },
    resolve(name) {
      const match = name.match(/^GPT-(\d+(?:\.\d+)*) Codex$/i)
      if (!match) return null

      return {
        bucketKey: 'gpt-codex',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gpt-main',
    light: { h: 148, s: 68, l: 40 },
    dark: { h: 148, s: 72, l: 57 },
    resolve(name) {
      const match = name.match(/^GPT-(\d+(?:\.\d+)*)$/i)
      if (!match) return null
      if (match[1] === '4.1') return null

      return {
        bucketKey: 'gpt-main',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gpt-omni',
    light: { h: 160, s: 58, l: 34 },
    dark: { h: 160, s: 62, l: 49 },
    resolve(name) {
      return /^GPT-(?:4o|4\.1)(?: .+)?$/i.test(name)
        ? {
            bucketKey: 'gpt-omni',
            version: null,
          }
        : null
    },
  },
  {
    id: 'o-series',
    light: { h: 166, s: 64, l: 33 },
    dark: { h: 166, s: 68, l: 48 },
    resolve(name) {
      const match = name.match(/^o(\d+)(?: (.+))?$/i)
      if (!match) return null

      return {
        bucketKey: `o-series:${String(match[2] || 'base')
          .trim()
          .toLowerCase()}`,
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gemini-flash-preview',
    light: { h: 48, s: 100, l: 42 },
    dark: { h: 52, s: 98, l: 61 },
    resolve(name) {
      const match = name.match(/^Gemini (\d+(?:\.\d+)*) Flash Preview(?: .+)?$/i)
      if (!match) return null

      return {
        bucketKey: 'gemini-flash-preview',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gemini-flash',
    light: { h: 44, s: 92, l: 39 },
    dark: { h: 46, s: 94, l: 56 },
    resolve(name) {
      const match = name.match(/^Gemini (\d+(?:\.\d+)*) Flash$/i)
      if (!match) return null

      return {
        bucketKey: 'gemini-flash',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gemini-pro',
    light: { h: 38, s: 86, l: 34 },
    dark: { h: 40, s: 88, l: 49 },
    resolve(name) {
      const match = name.match(/^Gemini (\d+(?:\.\d+)*) Pro$/i)
      if (!match) return null

      return {
        bucketKey: 'gemini-pro',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'gemini',
    light: { h: 42, s: 88, l: 36 },
    dark: { h: 44, s: 90, l: 52 },
    resolve(name) {
      const match = name.match(/^Gemini (\d+(?:\.\d+)*)$/i)
      if (!match) return null

      return {
        bucketKey: 'gemini',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'claude-opus',
    light: { h: 274, s: 68, l: 44 },
    dark: { h: 274, s: 74, l: 66 },
    resolve(name) {
      const match = name.match(/^(?:Claude\s+)?Opus (\d+(?:\.\d+)*)$/i)
      if (!match) return null

      return {
        bucketKey: 'claude-opus',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'claude-sonnet',
    light: { h: 214, s: 72, l: 44 },
    dark: { h: 214, s: 80, l: 63 },
    resolve(name) {
      const match = name.match(/^(?:Claude\s+)?Sonnet (\d+(?:\.\d+)*)$/i)
      if (!match) return null

      return {
        bucketKey: 'claude-sonnet',
        version: parseNumericVersion(match[1]),
      }
    },
  },
  {
    id: 'claude-haiku',
    light: { h: 28, s: 90, l: 43 },
    dark: { h: 28, s: 92, l: 61 },
    resolve(name) {
      const match = name.match(/^(?:Claude\s+)?Haiku (\d+(?:\.\d+)*)$/i)
      if (!match) return null

      return {
        bucketKey: 'claude-haiku',
        version: parseNumericVersion(match[1]),
      }
    },
  },
]

const FALLBACK_HUES = [148, 168, 190, 208, 226, 248, 272, 332, 18, 30, 44]

/**
 * Normalizes an unknown theme value to a supported color theme.
 *
 * @param theme - The requested theme value.
 * @returns The normalized shared color theme.
 */
function normalizeTheme(theme) {
  return theme === 'light' ? 'light' : 'dark'
}

function normalizeAlpha(alpha) {
  if (typeof alpha !== 'number' || !Number.isFinite(alpha)) return null
  if (alpha <= 0) return 0
  if (alpha >= 1) return 1
  return Math.round(alpha * 1000) / 1000
}

function hashName(name) {
  let hash = 0
  const value = String(name || '')
    .trim()
    .toLowerCase()
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return hash
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

function parseNumericVersion(version) {
  const normalized = String(version || '').trim()
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) return null
  return normalized.split('.').map((part) => Number.parseInt(part, 10))
}

function compareNumericVersions(left, right) {
  const maxLength = Math.max(left.length, right.length)
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }
  return 0
}

function versionKey(version) {
  return version ? version.join('.') : 'base'
}

function resolveKnownFamily(name) {
  const normalizedName = String(name || '').trim()
  for (const family of MODEL_COLOR_FAMILIES) {
    const resolved = family.resolve(normalizedName)
    if (resolved) {
      return {
        family,
        bucketKey: resolved.bucketKey,
        version: resolved.version,
      }
    }
  }
  return null
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function lightenFamilyColor(spec, rank, theme) {
  if (rank <= 0) return { ...spec }

  const lightnessStep = theme === 'light' ? 6 : 4
  const saturationStep = theme === 'light' ? 2 : 1
  const maxLightness = theme === 'light' ? 68 : 78
  const minSaturation = theme === 'light' ? 44 : 58

  return {
    h: spec.h,
    s: clamp(spec.s - rank * saturationStep, minSaturation, 100),
    l: clamp(spec.l + rank * lightnessStep, 0, maxLightness),
  }
}

function fallbackColor(name, theme) {
  const hash = hashName(name)
  const baseHue = FALLBACK_HUES[mod(hash, FALLBACK_HUES.length)]
  const hueShift = ((Math.abs(hash >> 4) % 7) - 3) * 4
  const hue = mod(baseHue + hueShift, 360)

  if (theme === 'light') {
    return {
      h: hue,
      s: 62 + (Math.abs(hash >> 8) % 10),
      l: 34 + (Math.abs(hash >> 12) % 8),
    }
  }

  return {
    h: hue,
    s: 68 + (Math.abs(hash >> 8) % 10),
    l: 52 + (Math.abs(hash >> 12) % 8),
  }
}

function buildPaletteAssignments(modelNames) {
  const names = [
    ...new Set((modelNames || []).map((name) => String(name || '').trim()).filter(Boolean)),
  ]
  const assignments = new Map()
  const buckets = new Map()

  for (const name of names) {
    const resolved = resolveKnownFamily(name)
    if (!resolved) continue

    if (resolved.version === null) {
      assignments.set(name, {
        family: resolved.family,
        rank: 0,
      })
      continue
    }

    const bucket = buckets.get(resolved.bucketKey) ?? {
      family: resolved.family,
      versions: new Map(),
    }
    const key = versionKey(resolved.version)
    const versionEntry = bucket.versions.get(key) ?? {
      names: [],
      version: resolved.version,
    }
    versionEntry.names.push(name)
    bucket.versions.set(key, versionEntry)
    buckets.set(resolved.bucketKey, bucket)
  }

  for (const bucket of buckets.values()) {
    const versionEntries = [...bucket.versions.values()].sort((left, right) =>
      compareNumericVersions(right.version, left.version),
    )

    versionEntries.forEach((entry, index) => {
      for (const name of entry.names) {
        assignments.set(name, {
          family: bucket.family,
          rank: index,
        })
      }
    })
  }

  return assignments
}

/**
 * Builds a shared color palette for the current dataset-wide model set.
 *
 * @param modelNames - The normalized model names currently present in the dataset.
 * @returns A palette resolver that keeps newer family versions on the base color.
 */
function createModelColorPalette(modelNames = []) {
  const assignments = buildPaletteAssignments(modelNames)

  function getColorSpec(name, options = {}) {
    const theme = normalizeTheme(options.theme)
    const normalizedName = String(name || '').trim()
    const assignment = assignments.get(normalizedName)

    if (!assignment) {
      return getModelColorSpec(normalizedName, options)
    }

    return lightenFamilyColor(assignment.family[theme], assignment.rank, theme)
  }

  function getColor(name, options = {}) {
    const spec = getColorSpec(name, options)
    const alpha = normalizeAlpha(options.alpha)
    return alpha === null ? toHslString(spec) : toHslaString(spec, alpha)
  }

  function getColorRgb(name, options = {}) {
    const spec = getColorSpec(name, options)
    const { r, g, b } = hslToRgb(spec)
    const alpha = normalizeAlpha(options.alpha)
    if (alpha === null) return `rgb(${r}, ${g}, ${b})`
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return Object.freeze({
    getColor,
    getColorRgb,
    getColorSpec,
  })
}

/**
 * Returns the shared color spec for a normalized model name.
 *
 * @param name - The model name to resolve.
 * @param options - The theme and alpha options for color resolution.
 * @returns The resolved HSL color spec.
 */
function getModelColorSpec(name, options = {}) {
  const theme = normalizeTheme(options.theme)
  const resolved = resolveKnownFamily(name)
  return resolved ? { ...resolved.family[theme] } : fallbackColor(name, theme)
}

function toHslString(spec) {
  return `hsl(${spec.h}, ${spec.s}%, ${spec.l}%)`
}

function toHslaString(spec, alpha) {
  return `hsla(${spec.h}, ${spec.s}%, ${spec.l}%, ${alpha})`
}

function hslToRgb(spec) {
  const hue = mod(spec.h, 360)
  const saturation = Math.max(0, Math.min(100, spec.s)) / 100
  const lightness = Math.max(0, Math.min(100, spec.l)) / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const huePrime = hue / 60
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma
    green = x
  } else if (huePrime < 2) {
    red = x
    green = chroma
  } else if (huePrime < 3) {
    green = chroma
    blue = x
  } else if (huePrime < 4) {
    green = x
    blue = chroma
  } else if (huePrime < 5) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  const match = lightness - chroma / 2
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  }
}

/**
 * Returns the shared model color as an HSL string.
 *
 * @param name - The model name to resolve.
 * @param options - The theme and alpha options for color resolution.
 * @returns The resolved CSS color string.
 */
function getModelColor(name, options = {}) {
  const spec = getModelColorSpec(name, options)
  const alpha = normalizeAlpha(options.alpha)
  return alpha === null ? toHslString(spec) : toHslaString(spec, alpha)
}

/**
 * Returns the shared model color as an RGB string.
 *
 * @param name - The model name to resolve.
 * @param options - The theme and alpha options for color resolution.
 * @returns The resolved CSS RGB color string.
 */
function getModelColorRgb(name, options = {}) {
  const spec = getModelColorSpec(name, options)
  const { r, g, b } = hslToRgb(spec)
  const alpha = normalizeAlpha(options.alpha)
  if (alpha === null) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

module.exports = {
  MODEL_COLOR_FAMILIES,
  createModelColorPalette,
  getModelColor,
  getModelColorRgb,
  getModelColorSpec,
  normalizeTheme,
}
