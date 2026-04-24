export function replaceColorInHtml(html: string, rawForms: string[], newColor: string): string {
  let result = html
  for (const raw of rawForms) {
    // Escape special regex characters in the raw form
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), newColor)
  }
  return result
}
