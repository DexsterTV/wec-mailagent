export function replaceFontInHtml(html: string, rawForms: string[], newFamily: string): string {
  let result = html
  for (const raw of rawForms) {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Replace only in font-family context to avoid false matches
    const pattern = new RegExp(`(font-family\\s*:\\s*)${escaped}`, 'gi')
    result = result.replace(pattern, `$1${newFamily}`)
  }
  return result
}
