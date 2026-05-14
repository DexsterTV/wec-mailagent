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
