export interface DetectedFont {
  family: string      // normalized font-family stack, e.g. "Arial, Helvetica, sans-serif"
  rawForms: string[]  // exact strings found in HTML (may vary in whitespace/quotes)
  count: number
}

// Matches: font-family: <value up to ; or } or end>
const FONT_FAMILY_PATTERN = /font-family\s*:\s*([^;}{]+)/gi

function normalizeFontFamily(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function processStyleText(text: string, map: Map<string, { rawForms: Set<string>; count: number }>) {
  FONT_FAMILY_PATTERN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = FONT_FAMILY_PATTERN.exec(text)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    const normalized = normalizeFontFamily(raw)

    if (!map.has(normalized)) map.set(normalized, { rawForms: new Set(), count: 0 })
    const entry = map.get(normalized)!
    entry.rawForms.add(raw)
    entry.count++
  }
}

export function extractFonts(html: string): DetectedFont[] {
  const map = new Map<string, { rawForms: Set<string>; count: number }>()

  // Inline style attributes. Backreference \1 keeps closing quote matching the
  // opening one so internal opposite-quote chars (e.g. 'Times New Roman') don't truncate.
  const inlineStyle = /style\s*=\s*("|')((?:(?!\1).)*)\1/gi
  let m: RegExpExecArray | null
  while ((m = inlineStyle.exec(html)) !== null) {
    processStyleText(m[2], map)
  }

  // <style> blocks
  const styleBlock = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleBlock.exec(html)) !== null) {
    processStyleText(m[1], map)
  }

  return Array.from(map.entries())
    .map(([family, entry]) => ({
      family,
      rawForms: Array.from(entry.rawForms),
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count)
}
