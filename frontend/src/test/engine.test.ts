import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../lib/utils/engine'

describe('renderTemplate', () => {
  it('substitutes plain placeholders', () => {
    const html = '<p>{{title}}</p>'
    const result = renderTemplate(html, { title: 'Hello' })
    expect(result).toContain('Hello')
  })

  it('HTML-escapes plain values', () => {
    const result = renderTemplate('<p>{{v}}</p>', { v: '<script>' })
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('inserts rawValues as-is without escaping', () => {
    const result = renderTemplate('{{html}}', {}, { html: '<b>bold</b>' })
    expect(result).toContain('<b>bold</b>')
  })

  it('renders boolean [if] blocks when true', () => {
    const html = '<!--[if:show]-->VISIBLE<!--[/if:show]-->'
    expect(renderTemplate(html, { show: true })).toContain('VISIBLE')
    expect(renderTemplate(html, { show: false })).not.toContain('VISIBLE')
    expect(renderTemplate(html, { show: 'true' })).toContain('VISIBLE')
  })

  it('renders [ifnotempty] blocks when value is non-empty', () => {
    const html = '<!--[ifnotempty:footer]-->FOOTER<!--[/ifnotempty:footer]-->'
    expect(renderTemplate(html, { footer: 'text' })).toContain('FOOTER')
    expect(renderTemplate(html, { footer: '' })).not.toContain('FOOTER')
    expect(renderTemplate(html, {})).not.toContain('FOOTER')
  })

  it('converts newlines to <br> in plain values', () => {
    const result = renderTemplate('{{text}}', { text: 'line1\nline2' })
    expect(result).toContain('<br>')
  })
})
