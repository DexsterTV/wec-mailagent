import type { TemplateField } from '../../types'

export interface TransformResult {
  newHtml: string
  fields: TemplateField[]
}

export function smartHtmlTransformer(html: string): TransformResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const generatedFields: TemplateField[] = []
  const counters: Record<string, number> = {}
  const isFullDoc = html.toLowerCase().includes('<html')
  let currentSection = 'Nagłówek'

  function updateSection(text: string) {
    const lower = text.toLowerCase().trim()
    if (
      currentSection === 'Nagłówek' &&
      (lower.includes('dzień dobry') ||
        lower.includes('cześć') ||
        lower.includes('informacja prasowa') ||
        lower.length > 50)
    ) {
      currentSection = 'Treść'
    } else if (
      currentSection === 'Treść' &&
      (lower.includes('materiały prasowe') ||
        lower.includes('do pobrania') ||
        lower.includes('packshot'))
    ) {
      currentSection = 'Materiały prasowe'
    } else if (
      currentSection === 'Materiały prasowe' &&
      (lower.includes('kontakt prasowy') || lower.includes('biuro prasowe'))
    ) {
      currentSection = 'Stopka'
    }
  }

  function generateSemanticName(node: Node, defaultBase: string): string {
    let base = defaultBase
    let targetNode: Node | null = node
    if (targetNode.nodeType === Node.TEXT_NODE) targetNode = (targetNode as Text).parentElement

    if (targetNode && (targetNode as Element).className) {
      const cls = (targetNode as Element).className
      if (typeof cls === 'string') {
        const firstClass = cls.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
        if (firstClass) base = firstClass.toLowerCase()
      }
    } else if (targetNode && (targetNode as Element).tagName) {
      base = (targetNode as Element).tagName.toLowerCase()
    }

    if (!counters[base]) counters[base] = 1
    return `${base}_${counters[base]++}`
  }

  function processNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tagName = el.tagName.toLowerCase()
      if (['style', 'script', 'title', 'meta'].includes(tagName)) return

      if (tagName === 'a') {
        const href = el.getAttribute('href')
        if (
          href &&
          href.trim() !== '' &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:') &&
          !href.startsWith('{{')
        ) {
          const varName = generateSemanticName(node, 'link')
          generatedFields.push({
            id: varName,
            label: `Link: ${href.substring(0, 30)}…`,
            type: 'text',
            default: href,
            section: currentSection,
          })
          el.setAttribute('href', `{{${varName}}}`)
        }
      }

      if (tagName === 'img') {
        const src = el.getAttribute('src')
        if (src && src.trim() !== '' && !src.startsWith('{{') && !src.startsWith('data:')) {
          const varName = generateSemanticName(node, 'img')
          generatedFields.push({
            id: varName,
            label: `Obraz: ${el.getAttribute('alt') || src.substring(0, 25)}…`,
            type: 'image-url',
            default: src,
            section: currentSection,
          })
          el.setAttribute('src', `{{${varName}}}`)
        }
      }

      Array.from(node.childNodes).forEach(processNode)
    } else if (node.nodeType === Node.TEXT_NODE) {
      const parent = (node as Text).parentElement
      const parentTag = parent?.tagName.toLowerCase() ?? ''
      if (['style', 'script', 'title'].includes(parentTag)) return

      const text = (node as Text).nodeValue ?? ''
      if (
        text.trim().length >= 3 &&
        /[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text) &&
        !text.includes('{{')
      ) {
        updateSection(text)
        const isLong = text.trim().length > 40
        const varName = generateSemanticName(node, isLong ? 'tresc' : 'etykieta')
        generatedFields.push({
          id: varName,
          label: text.trim().substring(0, 40) + '…',
          type: isLong ? 'textarea' : 'text',
          default: text.trim().replace(/\s+/g, ' '),
          section: currentSection,
        })
        ;(node as Text).nodeValue = `{{${varName}}}`
      }
    }
  }

  processNode(doc.body)

  generatedFields.forEach((f) => {
    if (f.section !== 'Stopka') return
    const val = (f.default || '').toLowerCase()
    if (!f.autofill) {
      if (/@/.test(val) && val.includes('.')) {
        f.autofill = 'email'
        f.label = 'E-mail kontaktowy'
      } else if (/^\+?[\d\s\-()]{7,}$/.test(val.trim())) {
        f.autofill = 'phone'
        f.label = 'Telefon kontaktowy'
      } else if (
        /^[A-ZŁŚŻŹ][a-ząćęłńóśźż]+ [A-ZŁŚŻŹ][a-ząćęłńóśźż]+$/.test(val.trim())
      ) {
        f.autofill = 'name'
        f.label = 'Imię i Nazwisko'
      } else if (/manager|director|specjalist|pr |press|rzecznik/i.test(val)) {
        f.autofill = 'position'
        f.label = 'Stanowisko'
      }
    }
  })

  const contactSelectField: TemplateField = {
    id: 'wybor_kontaktu_pr',
    label: 'Wybierz Kontakt PR — wypełni pola stopki',
    type: 'contact-select',
    default: '',
    section: 'Stopka',
  }
  const firstStopkaIdx = generatedFields.findIndex((f) => f.section === 'Stopka')
  if (firstStopkaIdx !== -1) generatedFields.splice(firstStopkaIdx, 0, contactSelectField)
  else generatedFields.push(contactSelectField)

  let prefix = ''
  if (isFullDoc) {
    const match = html.match(/^([\s\S]*?)<html/i)
    if (match) prefix = match[1]
  }
  const newHtml = isFullDoc ? prefix + doc.documentElement.outerHTML : doc.body.innerHTML

  return { newHtml, fields: generatedFields }
}

export function scanHtmlForVars(html: string): {
  vars: Set<string>
  types: Record<string, string>
  defaults: Record<string, unknown>
} {
  const vars = new Set<string>()
  const types: Record<string, string> = {}
  const defaults: Record<string, unknown> = {}

  const condRe = /<!--\[if:([a-zA-Z0-9_]+)\]-->/g
  let m: RegExpExecArray | null
  while ((m = condRe.exec(html)) !== null) {
    vars.add(m[1])
    types[m[1]] = 'boolean'
    defaults[m[1]] = true
  }

  const varRe = /\{\{([a-zA-Z0-9_]+)\}\}/g
  while ((m = varRe.exec(html)) !== null) {
    vars.add(m[1])
    if (!types[m[1]]) types[m[1]] = 'text'
  }

  return { vars, types, defaults }
}
