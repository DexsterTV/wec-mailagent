export function replaceCssPropertyValue(
  html: string,
  property: string,
  rawForms: string[],
  newValue: string,
): string {
  let result = html
  const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const raw of rawForms) {
    const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(${escapedProp}\\s*:\\s*)${escapedRaw}`, 'gi')
    result = result.replace(pattern, `$1${newValue}`)
  }
  return result
}
