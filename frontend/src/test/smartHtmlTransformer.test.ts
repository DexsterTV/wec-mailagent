import { describe, it, expect } from 'vitest'
import { scanHtmlForVars } from '../lib/utils/smartHtmlTransformer'

describe('scanHtmlForVars', () => {
  it('detects {{variable}} placeholders', () => {
    const html = '<h1>{{title}}</h1><p>{{lead}}</p>'
    const { vars, types } = scanHtmlForVars(html)
    expect(vars.has('title')).toBe(true)
    expect(vars.has('lead')).toBe(true)
    expect(types['title']).toBe('text')
  })

  it('detects boolean [if:...] conditionals', () => {
    const html = '<!--[if:showImage]--><img><!--[/if:showImage]-->'
    const { vars, types, defaults } = scanHtmlForVars(html)
    expect(vars.has('showImage')).toBe(true)
    expect(types['showImage']).toBe('boolean')
    expect(defaults['showImage']).toBe(true)
  })

  it('returns empty set for HTML without placeholders', () => {
    const { vars } = scanHtmlForVars('<p>Hello world</p>')
    expect(vars.size).toBe(0)
  })
})
