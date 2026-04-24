import { describe, it, expect } from 'vitest'
import {
  normalizeExternalImageUrl,
  isImageField,
  decorateImageTags,
} from '../lib/utils/templateUtils'
import type { TemplateField } from '../types'

describe('normalizeExternalImageUrl', () => {
  it('returns https:// URLs unchanged', () => {
    const url = 'https://example.com/img.jpg'
    expect(normalizeExternalImageUrl(url)).toBe(url)
  })

  it('prepends https: to protocol-relative URLs', () => {
    expect(normalizeExternalImageUrl('//cdn.example.com/img.jpg')).toBe(
      'https://cdn.example.com/img.jpg',
    )
  })

  it('prepends https:// to www. URLs', () => {
    expect(normalizeExternalImageUrl('www.example.com/img.jpg')).toBe(
      'https://www.example.com/img.jpg',
    )
  })

  it('returns empty string for empty input', () => {
    expect(normalizeExternalImageUrl('')).toBe('')
  })

  it('leaves data: URLs unchanged', () => {
    expect(normalizeExternalImageUrl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    )
  })
})

describe('isImageField', () => {
  it('returns true for image-url type', () => {
    const f: TemplateField = { id: 'img', label: 'Img', type: 'image-url' }
    expect(isImageField(f)).toBe(true)
  })

  it('detects image in HTML src', () => {
    const f: TemplateField = { id: 'hero', label: 'Hero', type: 'text' }
    const html = '<img src="{{hero}}">'
    expect(isImageField(f, html)).toBe(true)
  })

  it('returns false for unrelated text field', () => {
    const f: TemplateField = { id: 'title', label: 'Title', type: 'text' }
    expect(isImageField(f, '<h1>{{title}}</h1>')).toBe(false)
  })
})

describe('decorateImageTags', () => {
  it('adds referrerpolicy to img tags', () => {
    const result = decorateImageTags('<img src="x.jpg">')
    expect(result).toContain('referrerpolicy="no-referrer"')
  })

  it('does not duplicate referrerpolicy', () => {
    const html = '<img referrerpolicy="no-referrer" src="x.jpg">'
    const result = decorateImageTags(html)
    expect(result.match(/referrerpolicy/g)?.length).toBe(1)
  })
})
