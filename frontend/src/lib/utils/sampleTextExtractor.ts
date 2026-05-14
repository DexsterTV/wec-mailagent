/**
 * For a given CSS property + value, find the first HTML element that has
 * that value in its inline style attribute and return its text content.
 * This lets the editor show real template text relevant to each CSS value.
 */
export function findSampleText(
  html: string,
  property: string,
  rawForms: string[],
  maxLen = 40,
): string {
  for (const raw of rawForms) {
    const text = extractForStyleValue(html, property, raw, maxLen)
    if (text) return text
  }
  return ''
}

function extractForStyleValue(
  html: string,
  property: string,
  value: string,
  maxLen: number,
): string {
  const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedVal = value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Match style="... property: value ..."
  const pattern = new RegExp(
    `style\\s*=\\s*["'][^"']*${escapedProp}\\s*:\\s*${escapedVal}[^"']*["']`,
    'i',
  )
  const m = pattern.exec(html)
  if (!m) return ''

  // Find closing '>' of the opening tag
  const tagEnd = html.indexOf('>', m.index + m[0].length)
  if (tagEnd === -1) return ''

  // Grab text between '>' and first child tag '<'
  const after = html.slice(tagEnd + 1)
  const nextTag = after.indexOf('<')
  const raw = (nextTag === -1 ? after : after.slice(0, nextTag))
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (raw.length < 3) return ''

  // Trim to word boundary at maxLen
  const words = raw.split(' ')
  let result = ''
  for (const word of words) {
    const next = result ? `${result} ${word}` : word
    if (next.length > maxLen) break
    result = next
  }
  return result
}
