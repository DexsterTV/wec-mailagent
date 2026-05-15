// Replace exactly one color occurrence at the given byte position in HTML.
// Verifies the raw form still matches at that position before replacing.
// Returns the original html unchanged if the position is no longer valid.
export function replaceColorAtPosition(
  html: string,
  position: number,
  originalRawForm: string,
  newColor: string,
): string {
  const actual = html.substr(position, originalRawForm.length)
  if (actual !== originalRawForm) return html
  return html.slice(0, position) + newColor + html.slice(position + originalRawForm.length)
}

export function replaceColorInHtml(html: string, rawForms: string[], newColor: string): string {
  let result = html
  for (const raw of rawForms) {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), newColor)
  }
  return result
}

// Replace a color only within the context of a specific CSS property declaration.
// e.g. replaceColorForProperty(html, 'background-color', ['#ff0000'], '#00ff00')
// will change "background-color: #ff0000" but leave "border-color: #ff0000" untouched.
export function replaceColorForProperty(
  html: string,
  property: string,
  rawForms: string[],
  newColor: string,
): string {
  let result = html
  const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const raw of rawForms) {
    const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match: property-name: [optional other tokens] color-value
    // [^;{}]* matches shorthand values like "1px solid #ff0000"
    const pattern = new RegExp(`(${escapedProp}\\s*:[^;{}]*?)${escapedRaw}`, 'gi')
    result = result.replace(pattern, `$1${newColor}`)
  }
  return result
}
