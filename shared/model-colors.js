const MODEL_COLOR_RULES = [
  {
    pattern: /^OpenCode$/i,
    light: { h: 192, s: 76, l: 40 },
    dark: { h: 192, s: 82, l: 58 },
  },
  {
    pattern: /^Codex(?: .+)?$/i,
    light: { h: 194, s: 72, l: 38 },
    dark: { h: 194, s: 78, l: 55 },
  },
  {
    pattern: /^GPT-5\.4 Codex$/i,
    light: { h: 194, s: 76, l: 42 },
    dark: { h: 194, s: 82, l: 60 },
  },
  {
    pattern: /^GPT-5\.3 Codex$/i,
    light: { h: 194, s: 70, l: 36 },
    dark: { h: 194, s: 74, l: 52 },
  },
  {
    pattern: /^GPT-5\.4$/i,
    light: { h: 148, s: 68, l: 40 },
    dark: { h: 148, s: 72, l: 57 },
  },
  {
    pattern: /^GPT-5$/i,
    light: { h: 148, s: 60, l: 33 },
    dark: { h: 148, s: 64, l: 47 },
  },
  {
    pattern: /^GPT-(?:4o|4\.1)(?: .+)?$/i,
    light: { h: 160, s: 58, l: 34 },
    dark: { h: 160, s: 62, l: 49 },
  },
  {
    pattern: /^o4 Mini$/i,
    light: { h: 166, s: 64, l: 33 },
    dark: { h: 166, s: 68, l: 48 },
  },
  {
    pattern: /^o1$/i,
    light: { h: 166, s: 56, l: 30 },
    dark: { h: 166, s: 60, l: 43 },
  },
  {
    pattern: /^Gemini 3 Flash Preview(?: .+)?$/i,
    light: { h: 48, s: 100, l: 42 },
    dark: { h: 52, s: 98, l: 61 },
  },
  {
    pattern: /^Gemini 2\.5 Flash$/i,
    light: { h: 44, s: 92, l: 39 },
    dark: { h: 46, s: 94, l: 56 },
  },
  {
    pattern: /^Gemini 2\.5 Pro$/i,
    light: { h: 38, s: 86, l: 34 },
    dark: { h: 40, s: 88, l: 49 },
  },
  {
    pattern: /^Gemini(?: .+)?$/i,
    light: { h: 42, s: 88, l: 36 },
    dark: { h: 44, s: 90, l: 52 },
  },
  {
    pattern: /^(?:Claude\s+)?Opus 4\.6$/i,
    light: { h: 274, s: 68, l: 44 },
    dark: { h: 274, s: 74, l: 66 },
  },
  {
    pattern: /^(?:Claude\s+)?Opus 4\.5$/i,
    light: { h: 274, s: 58, l: 36 },
    dark: { h: 274, s: 62, l: 56 },
  },
  {
    pattern: /^(?:Claude\s+)?Opus(?: .+)?$/i,
    light: { h: 274, s: 62, l: 40 },
    dark: { h: 274, s: 68, l: 60 },
  },
  {
    pattern: /^(?:Claude\s+)?Sonnet 4\.6$/i,
    light: { h: 214, s: 72, l: 44 },
    dark: { h: 214, s: 80, l: 63 },
  },
  {
    pattern: /^(?:Claude\s+)?Sonnet 4\.5$/i,
    light: { h: 214, s: 60, l: 36 },
    dark: { h: 214, s: 66, l: 52 },
  },
  {
    pattern: /^(?:Claude\s+)?Sonnet 4$/i,
    light: { h: 214, s: 56, l: 34 },
    dark: { h: 214, s: 62, l: 48 },
  },
  {
    pattern: /^(?:Claude\s+)?Sonnet(?: .+)?$/i,
    light: { h: 214, s: 64, l: 40 },
    dark: { h: 214, s: 70, l: 56 },
  },
  {
    pattern: /^(?:Claude\s+)?Haiku 4\.5$/i,
    light: { h: 28, s: 90, l: 43 },
    dark: { h: 28, s: 92, l: 61 },
  },
  {
    pattern: /^(?:Claude\s+)?Haiku(?: .+)?$/i,
    light: { h: 28, s: 84, l: 38 },
    dark: { h: 28, s: 88, l: 56 },
  },
]

const FALLBACK_HUES = [148, 168, 190, 208, 226, 248, 272, 332, 18, 30, 44]

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

function findKnownColor(name) {
  return MODEL_COLOR_RULES.find((rule) => rule.pattern.test(String(name || '').trim())) ?? null
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

function getModelColorSpec(name, options = {}) {
  const theme = normalizeTheme(options.theme)
  const known = findKnownColor(name)
  return known ? { ...known[theme] } : fallbackColor(name, theme)
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

function getModelColor(name, options = {}) {
  const spec = getModelColorSpec(name, options)
  const alpha = normalizeAlpha(options.alpha)
  return alpha === null ? toHslString(spec) : toHslaString(spec, alpha)
}

function getModelColorRgb(name, options = {}) {
  const spec = getModelColorSpec(name, options)
  const { r, g, b } = hslToRgb(spec)
  const alpha = normalizeAlpha(options.alpha)
  if (alpha === null) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

module.exports = {
  MODEL_COLOR_RULES,
  getModelColor,
  getModelColorRgb,
  getModelColorSpec,
  normalizeTheme,
}
