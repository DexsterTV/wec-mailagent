export function renderTemplate(
  htmlTemplate: string,
  values: Record<string, unknown>,
  rawValues: Record<string, string> = {},
): string {
  let result = htmlTemplate

  // 1. Boolean conditionals <!--[if:field]--> ... <!--[/if:field]-->
  result = result.replace(
    /<!--\[if:([a-zA-Z0-9_]+)\]-->([\s\S]*?)<!--\[\/if:\1\]-->/g,
    (_match, fieldName: string, content: string) => {
      const isVisible = values[fieldName] === true || values[fieldName] === 'true'
      return isVisible ? content : ''
    },
  )

  // 2. Non-empty conditionals <!--[ifnotempty:field]--> ... <!--[/ifnotempty:field]-->
  result = result.replace(
    /<!--\[ifnotempty:([a-zA-Z0-9_]+)\]-->([\s\S]*?)<!--\[\/ifnotempty:\1\]-->/g,
    (_match, fieldName: string, content: string) => {
      const checkVal = fieldName in rawValues ? rawValues[fieldName] : values[fieldName]
      const isEmpty =
        checkVal === undefined || checkVal === null || String(checkVal).trim() === ''
      return isEmpty ? '' : content
    },
  )

  // 3. Auto-remove elements whose only content is a single empty placeholder
  result = result.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\s*>\s*\{\{([a-zA-Z0-9_]+)\}\}\s*<\/\1\s*>/g,
    (_match, _tag: string, _attrs: string, fieldName: string) => {
      if (fieldName in rawValues) return _match
      const val = values[fieldName]
      const isEmpty = val === undefined || val === null || String(val).trim() === ''
      return isEmpty ? '' : _match
    },
  )

  // 4. Replace {{fieldName}} placeholders
  result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, fieldName: string) => {
    if (fieldName in rawValues) {
      const raw = rawValues[fieldName]
      return raw === undefined || raw === null ? '' : String(raw)
    }
    let val: unknown = values[fieldName]
    if (val === undefined || val === null) val = ''
    if (typeof val === 'string') {
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      val = (val as string).replace(/\n/g, '<br>')
    }
    return String(val)
  })

  // 5. Smart empty-block removal (browser-only via DOMParser)
  if (typeof DOMParser !== 'undefined') {
    result = removeEmptyBlocks(result)
  }

  return result
}

function hasVisibleContent(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node as Text).nodeValue?.trim() !== '') return true
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as Element
      if (['IMG', 'INPUT', 'VIDEO', 'AUDIO', 'CANVAS', 'OBJECT', 'EMBED', 'HR'].includes(elem.tagName))
        return true
      if (hasVisibleContent(elem)) return true
    }
  }
  return false
}

function removeEmptyBlocks(html: string): string {
  const isFullDoc = /<html[\s>]/i.test(html)
  const doc = new DOMParser().parseFromString(
    isFullDoc ? html : `<!DOCTYPE html><html><body>${html}</body></html>`,
    'text/html',
  )

  const REMOVABLE =
    'div,p,h1,h2,h3,h4,h5,h6,section,article,header,footer,li,blockquote,span,a,strong,em,b,i'

  let changed = true
  while (changed) {
    changed = false
    const elements = doc.body.querySelectorAll(REMOVABLE)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (!el.isConnected) continue
      if (!hasVisibleContent(el)) {
        el.remove()
        changed = true
      }
    }
  }

  return isFullDoc ? doc.documentElement.outerHTML : doc.body.innerHTML
}
