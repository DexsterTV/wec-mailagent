import type { DetectedColor, ColorRole } from '../../types'

// Normalize any supported color format to 6-digit lowercase hex
export function normalizeToHex(color: string): string | null {
  const s = color.trim()

  // #rgb
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const [, r, g, b] = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)!
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  // #rrggbb
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
  // #rrggbbaa — strip alpha
  if (/^#[0-9a-f]{8}$/i.test(s)) return s.slice(0, 7).toLowerCase()

  // rgb(r, g, b)
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    return (
      '#' +
      [rgb[1], rgb[2], rgb[3]]
        .map((n) => parseInt(n).toString(16).padStart(2, '0'))
        .join('')
    ).toLowerCase()
  }

  // hsl(h, s%, l%)
  const hsl = s.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i)
  if (hsl) {
    return hslToHex(parseFloat(hsl[1]), parseFloat(hsl[2]), parseFloat(hsl[3]))
  }

  return null
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// COLOR_PATTERN matches hex, rgb/rgba, hsl/hsla
const COLOR_PATTERN =
  /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi

// CSS property name preceding the color value (from inline style or CSS rule)
const PROP_BEFORE_PATTERN = /([\w-]+)\s*:\s*(?:[^;]*?)?(?=COLOR)/

function classifyRole(properties: string[], hex: string, count: number): ColorRole {
  const props = properties.join(' ')
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // neutral = very dark or very light
  const lightness = (r * 299 + g * 587 + b * 114) / 1000
  const isNeutral = lightness < 30 || lightness > 220

  if (props.includes('background') || props.includes('bg')) {
    if (isNeutral) return 'background'
    return count >= 3 ? 'primary' : 'secondary'
  }
  if (props.includes('border') || props.includes('outline')) return 'border'
  if (props.includes('color')) {
    if (isNeutral) return 'text'
    return 'accent'
  }
  if (isNeutral) return 'other'
  return count >= 4 ? 'primary' : count >= 2 ? 'secondary' : 'accent'
}

const ROLE_LABELS: Record<ColorRole, string> = {
  primary:    'Kolor wiodący (akcent marki)',
  secondary:  'Kolor uzupełniający',
  accent:     'Kolor wyróżnienia',
  background: 'Kolor tła',
  text:       'Kolor tekstu',
  border:     'Kolor obramowania',
  other:      'Pozostałe kolory',
}

// Human-readable Polish names for CSS properties
export const PROP_PL: Record<string, string> = {
  'background-color': 'tło',
  'background':       'tło',
  'color':            'tekst',
  'border-color':     'obramowanie',
  'border':           'obramowanie',
  'border-top':       'obramowanie górne',
  'border-bottom':    'obramowanie dolne',
  'border-left':      'obramowanie lewe',
  'border-right':     'obramowanie prawe',
  'outline':          'kontur',
  'box-shadow':       'cień',
  'fill':             'wypełnienie',
  'stroke':           'obrys',
  'text-decoration-color': 'podkreślenie',
  'caret-color':      'kursor',
}

interface RawEntry {
  rawForms: Set<string>
  count: number
  properties: Set<string>
  hex: string
  property: string
}

export function extractColors(html: string): DetectedColor[] {
  // Map key: "${hex}|${cssProperty}" — one entry per (color, property) combination
  const map = new Map<string, RawEntry>()

  function processStyleValue(styleText: string) {
    let m: RegExpExecArray | null
    COLOR_PATTERN.lastIndex = 0
    while ((m = COLOR_PATTERN.exec(styleText)) !== null) {
      const raw = m[0]
      const hex = normalizeToHex(raw)
      if (!hex) continue

      const before = styleText.slice(Math.max(0, m.index - 60), m.index)
      const propMatch = before.match(/([\w-]+)\s*:\s*[^;]*$/)
      const prop = propMatch ? propMatch[1].toLowerCase() : ''

      const key = prop ? `${hex}|${prop}` : hex
      if (!map.has(key)) map.set(key, { rawForms: new Set(), count: 0, properties: new Set(), hex, property: prop })
      const entry = map.get(key)!
      entry.rawForms.add(raw)
      entry.count++
      if (prop) entry.properties.add(prop)
    }
  }

  // Scan inline style attributes
  const inlineStyle = /style\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = inlineStyle.exec(html)) !== null) {
    processStyleValue(m[1])
  }

  // Scan <style> blocks
  const styleBlock = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleBlock.exec(html)) !== null) {
    processStyleValue(m[1])
  }

  const results: DetectedColor[] = []
  map.forEach((entry) => {
    const { hex, property } = entry
    const properties = Array.from(entry.properties)
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const lightness = (r * 299 + g * 587 + b * 114) / 1000
    const isNeutral = lightness < 30 || lightness > 220
    const role = classifyRole(properties, hex, entry.count)

    const propDescriptions = properties
      .map((p) => PROP_PL[p] ?? null)
      .filter((v): v is string => v !== null)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 2)
    const label = propDescriptions.length > 0
      ? `${ROLE_LABELS[role]} — ${propDescriptions.join(', ')}`
      : ROLE_LABELS[role]

    results.push({
      hex,
      primaryProperty: property || undefined,
      rawForms: Array.from(entry.rawForms),
      count: entry.count,
      properties,
      role,
      label,
      isNeutral,
    })
  })

  const rolePriority: Record<ColorRole, number> = {
    primary: 0, secondary: 1, accent: 2, background: 3, text: 4, border: 5, other: 6,
  }
  results.sort((a, b) => rolePriority[a.role] - rolePriority[b.role] || b.count - a.count)

  return results
}

// Build a single DetectedColor record for one occurrence at a known position.
function buildEntry(raw: string, hex: string, prop: string, position: number): DetectedColor {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lightness = (r * 299 + g * 587 + b * 114) / 1000
  const isNeutral = lightness < 30 || lightness > 220
  const role = classifyRole(prop ? [prop] : [], hex, 1)

  const propDesc = prop ? (PROP_PL[prop] ?? null) : null
  const label = propDesc ? `${ROLE_LABELS[role]} — ${propDesc}` : ROLE_LABELS[role]

  return {
    hex,
    primaryProperty: prop || undefined,
    rawForms: [raw],
    count: 1,
    properties: prop ? [prop] : [],
    role,
    label,
    isNeutral,
    position,
    rawForm: raw,
  }
}

// Emit ONE DetectedColor per actual occurrence in the HTML, with absolute position.
// This lets each occurrence be edited independently even when hex and property are identical.
export function extractColorsPerOccurrence(html: string): DetectedColor[] {
  const results: DetectedColor[] = []

  function processContent(content: string, baseOffset: number) {
    const pattern = new RegExp(COLOR_PATTERN.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = pattern.exec(content)) !== null) {
      const raw = m[0]
      const hex = normalizeToHex(raw)
      if (!hex) continue

      const before = content.slice(Math.max(0, m.index - 60), m.index)
      const propMatch = before.match(/([\w-]+)\s*:\s*[^;]*$/)
      const prop = propMatch ? propMatch[1].toLowerCase() : ''

      results.push(buildEntry(raw, hex, prop, baseOffset + m.index))
    }
  }

  // Inline style attributes. Use simple quote class (matches old extractColors behavior)
  // and compute contentStart from position of first quote in the match.
  const inlineStyle = /style\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = inlineStyle.exec(html)) !== null) {
    const content = m[1]
    const quoteOffset = m[0].search(/["']/)
    if (quoteOffset === -1) continue
    const contentStart = m.index + quoteOffset + 1
    processContent(content, contentStart)
  }

  // <style> blocks
  const styleBlock = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleBlock.exec(html)) !== null) {
    const fullMatch = m[0]
    const content = m[1]
    const contentStart = m.index + fullMatch.indexOf('>') + 1
    processContent(content, contentStart)
  }

  return results.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}
