export interface DetectedTypographyValue {
  property: 'font-size' | 'line-height' | 'letter-spacing'
  value: string    // raw CSS value, e.g. "14px", "1.5", "0.5px"
  rawForms: string[]
  count: number
}

const TRACKED_PROPS = ['font-size', 'line-height', 'letter-spacing'] as const

function processStyleText(
  text: string,
  map: Map<string, { rawForms: Set<string>; count: number; property: string }>,
) {
  for (const prop of TRACKED_PROPS) {
    const pattern = new RegExp(`${prop}\\s*:\\s*([^;}{]+)`, 'gi')
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const raw = m[1].trim()
      if (!raw || raw === 'inherit' || raw === 'initial' || raw === 'normal' || raw === 'unset') continue
      const key = `${prop}|${raw}`
      if (!map.has(key)) map.set(key, { rawForms: new Set(), count: 0, property: prop })
      const entry = map.get(key)!
      entry.rawForms.add(raw)
      entry.count++
    }
  }
}

export function extractTypography(html: string): DetectedTypographyValue[] {
  const map = new Map<string, { rawForms: Set<string>; count: number; property: string }>()

  const inlineStyle = /style\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = inlineStyle.exec(html)) !== null) processStyleText(m[1], map)

  const styleBlock = /<style[^>]*>([\s\S]*?)<\/style>/gi
  while ((m = styleBlock.exec(html)) !== null) processStyleText(m[1], map)

  return Array.from(map.entries())
    .map(([, entry]) => ({
      property: entry.property as DetectedTypographyValue['property'],
      value: Array.from(entry.rawForms)[0],
      rawForms: Array.from(entry.rawForms),
      count: entry.count,
    }))
    .sort((a, b) => {
      const order = ['font-size', 'line-height', 'letter-spacing']
      const diff = order.indexOf(a.property) - order.indexOf(b.property)
      return diff !== 0 ? diff : b.count - a.count
    })
}
