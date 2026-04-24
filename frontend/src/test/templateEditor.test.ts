import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeTemplateMetadata } from '../lib/utils/templateEditor'
import type { Template } from '../types'

const baseTemplate: Template = {
  id: 'press-release',
  name: 'Informacja prasowa',
  html: '<div>Hello</div>',
  fields: [],
}

afterEach(() => {
  vi.useRealTimers()
})

describe('mergeTemplateMetadata', () => {
  it('preserves existing metadata during template edits', () => {
    const result = mergeTemplateMetadata({
      nextTemplate: baseTemplate,
      existingTemplate: {
        ...baseTemplate,
        _v: 2,
        createdBy: 'Jan Kowalski',
        createdAt: '2026-04-20T10:00:00.000Z',
      },
      currentUser: 'Anna Nowak',
    })

    expect(result._v).toBe(2)
    expect(result.createdBy).toBe('Jan Kowalski')
    expect(result.createdAt).toBe('2026-04-20T10:00:00.000Z')
  })

  it('falls back to the default template version when the payload omits _v', () => {
    const result = mergeTemplateMetadata({
      nextTemplate: baseTemplate,
      defaultTemplate: {
        ...baseTemplate,
        _v: 3,
      },
      currentUser: 'Anna Nowak',
    })

    expect(result._v).toBe(3)
    expect(result.createdBy).toBe('Anna Nowak')
  })

  it('creates createdAt metadata for brand-new templates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-23T12:00:00.000Z'))

    const result = mergeTemplateMetadata({
      nextTemplate: {
        ...baseTemplate,
        id: 'custom-template',
      },
      currentUser: 'Anna Nowak',
    })

    expect(result.createdBy).toBe('Anna Nowak')
    expect(result.createdAt).toBe('2026-04-23T12:00:00.000Z')
  })
})
