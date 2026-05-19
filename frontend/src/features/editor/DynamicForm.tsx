import type { Template, TemplateField, Contact } from '../../types'
import { normalizeExternalImageUrl, isImageField } from '../../lib/utils/templateUtils'

const SECTION_ORDER = ['Nagłówek', 'Treść', 'Materiały prasowe', 'Opcje', 'Stopka', 'Ogólne']

interface Props {
  template: Template
  values: Record<string, string>
  contacts: Contact[]
  onChange: (name: string, value: string) => void
  onContactSelect: (contactId: string, field: TemplateField) => void
  onBooleanToggle: (name: string, checked: boolean) => void
}

function groupBySection(fields: TemplateField[]): Record<string, TemplateField[]> {
  const grouped: Record<string, TemplateField[]> = {}
  fields.forEach((f) => {
    const sec = f.section?.trim() || 'Ogólne'
    if (!grouped[sec]) grouped[sec] = []
    grouped[sec].push(f)
  })
  return grouped
}

function groupBySubsection(fields: TemplateField[]): { subsection: string | null; fields: TemplateField[] }[] {
  const result: { subsection: string | null; fields: TemplateField[] }[] = []
  let current: { subsection: string | null; fields: TemplateField[] } | null = null
  fields.forEach((f) => {
    const sub = f.subsection ?? null
    if (!current || current.subsection !== sub) {
      current = { subsection: sub, fields: [] }
      result.push(current)
    }
    current.fields.push(f)
  })
  return result
}

function sortSections(sections: string[]): string[] {
  return [...sections].sort((a, b) => {
    let ia = SECTION_ORDER.indexOf(a)
    let ib = SECTION_ORDER.indexOf(b)
    if (ia === -1) ia = 99
    if (ib === -1) ib = 99
    return ia - ib
  })
}

export default function DynamicForm({
  template,
  values,
  contacts,
  onChange,
  onContactSelect,
  onBooleanToggle,
}: Props) {
  const grouped = groupBySection(template.fields)
  const sections = sortSections(Object.keys(grouped))

  return (
    <form className="dynamic-form" onSubmit={(e) => e.preventDefault()}>
      {sections.map((secName) => {
        const fields = grouped[secName]
        const visibleFields = fields.filter((f) => {
          if (f.visibleIf) {
            const cond = values[f.visibleIf]
            return cond === 'true' || cond === 'on' || cond === '1'
          }
          return true
        })
        if (visibleFields.length === 0) return null

        const subsectionGroups = groupBySubsection(visibleFields)

        return (
          <details key={secName} className="form-section" data-section={secName}>
            <summary className="form-section-header">
              <span className="form-section-title">{secName}</span>
              <svg
                className="form-section-chevron"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="form-section-body">
              {subsectionGroups.map((group, gi) => (
                <div key={gi} className="form-subsection">
                  {group.subsection && (
                    <div className="form-subsection-label">{group.subsection}</div>
                  )}
                  {group.fields.map((field) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? ''}
                      contacts={contacts}
                      htmlTemplate={template.html}
                      onChange={onChange}
                      onContactSelect={onContactSelect}
                      onBooleanToggle={onBooleanToggle}
                    />
                  ))}
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </form>
  )
}

interface FieldRowProps {
  field: TemplateField
  value: string
  contacts: Contact[]
  htmlTemplate: string
  onChange: (name: string, value: string) => void
  onContactSelect: (contactId: string, field: TemplateField) => void
  onBooleanToggle: (name: string, checked: boolean) => void
}

function FieldRow({
  field,
  value,
  contacts,
  htmlTemplate,
  onChange,
  onContactSelect,
  onBooleanToggle,
}: FieldRowProps) {
  const id = `field_${field.id}`

  if (field.type === 'boolean') {
    return (
      <div className="checkbox-group">
        <input
          type="checkbox"
          id={id}
          name={field.id}
          checked={value === 'true' || value === 'on' || value === '1'}
          onChange={(e) => onBooleanToggle(field.id, e.target.checked)}
        />
        <label htmlFor={id}>{field.label}</label>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="form-group">
        <label htmlFor={id}>{field.label}</label>
        <FormatToolbar
          targetId={id}
          value={value}
          onChange={(v) => onChange(field.id, v)}
          disabled={!!field.locked}
        />
        <textarea
          id={id}
          name={field.id}
          value={value}
          readOnly={!!field.locked}
          aria-readonly={!!field.locked || undefined}
          style={field.locked ? { backgroundColor: 'rgba(0,0,0,0.04)', cursor: 'not-allowed' } : undefined}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      </div>
    )
  }

  if (field.type === 'color') {
    const safeHex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'
    return (
      <div className="form-group">
        <label htmlFor={id}>{field.label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ position: 'relative', cursor: field.locked ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: safeHex,
              border: '2px solid var(--panel-border)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
              opacity: field.locked ? 0.5 : 1,
            }} />
            {!field.locked && (
              <input
                type="color"
                value={safeHex}
                onChange={(e) => onChange(field.id, e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                tabIndex={-1}
              />
            )}
          </label>
          <input
            type="text"
            id={id}
            name={field.id}
            value={value}
            placeholder="#000000"
            maxLength={7}
            readOnly={!!field.locked}
            onChange={(e) => {
              const v = e.target.value.trim()
              onChange(field.id, v.startsWith('#') ? v : v ? `#${v}` : v)
            }}
            style={{
              width: 96,
              fontFamily: 'Consolas, monospace',
              fontSize: 13,
              ...(field.locked ? { backgroundColor: 'rgba(0,0,0,0.04)', cursor: 'not-allowed' } : {}),
            }}
          />
        </div>
      </div>
    )
  }

  if (field.type === 'image-url') {
    return (
      <div className="form-group">
        <label htmlFor={id}>{field.label}</label>
        <input
          type="url"
          id={id}
          name={field.id}
          value={value}
          placeholder="https://..."
          style={{ borderLeft: '3px solid var(--primary)' }}
          readOnly={!!field.locked}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={(e) => {
            const normalized = normalizeExternalImageUrl(e.target.value)
            if (normalized !== e.target.value) onChange(field.id, normalized)
          }}
        />
        <div className="field-hint">
          Wklej link do obrazu lub adres od <code>www.</code>
        </div>
      </div>
    )
  }

  if (field.type === 'contact-select') {
    return (
      <div className="form-group">
        <label htmlFor={id}>{field.label}</label>
        <select
          id={id}
          name={field.id}
          value={value}
          disabled={!!field.locked}
          onChange={(e) => onContactSelect(e.target.value, field)}
        >
          <option value="">-- Brak kontaktu --</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.position || ''}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // default: text
  const isImg = isImageField(field, htmlTemplate)
  return (
    <div className="form-group">
      <label htmlFor={id}>{field.label}</label>
      {!isImg && (
        <FormatToolbar
          targetId={id}
          value={value}
          onChange={(v) => onChange(field.id, v)}
          disabled={!!field.locked}
        />
      )}
      <input
        type="text"
        id={id}
        name={field.id}
        value={value}
        readOnly={!!field.locked}
        style={field.locked ? { backgroundColor: 'rgba(0,0,0,0.04)', cursor: 'not-allowed' } : isImg ? { borderLeft: '3px solid var(--primary)' } : undefined}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
    </div>
  )
}

interface FormatToolbarProps {
  targetId: string
  value: string
  onChange: (newValue: string) => void
  disabled?: boolean
}

function FormatToolbar({ targetId, value, onChange, disabled }: FormatToolbarProps) {
  function wrap(tag: string) {
    const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null
    if (!el) {
      // No element — append empty tag pair at end as a fallback
      onChange(`${value}<${tag}></${tag}>`)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const before = value.slice(0, start)
    const after = value.slice(end)
    const newValue = `${before}<${tag}>${selected}</${tag}>${after}`
    onChange(newValue)
    // Restore focus + place cursor between the new tags (or keep the wrapped selection highlighted)
    requestAnimationFrame(() => {
      el.focus()
      const innerStart = before.length + tag.length + 2 // length of `<tag>`
      const innerEnd = innerStart + selected.length
      el.setSelectionRange(innerStart, innerEnd)
    })
  }

  const btnStyle: React.CSSProperties = {
    width: 28,
    height: 26,
    padding: 0,
    border: '1px solid var(--panel-border)',
    background: 'var(--bg-0)',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: 'var(--text-700)',
    fontSize: 13,
    lineHeight: 1,
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1,
  }

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
      <button type="button" disabled={disabled} title="Pogrubienie (Bold)" onClick={() => wrap('strong')} style={{ ...btnStyle, fontWeight: 700 }}>B</button>
      <button type="button" disabled={disabled} title="Kursywa (Italic)" onClick={() => wrap('em')} style={{ ...btnStyle, fontStyle: 'italic' }}>I</button>
      <button type="button" disabled={disabled} title="Podkreślenie (Underline)" onClick={() => wrap('u')} style={{ ...btnStyle, textDecoration: 'underline' }}>U</button>
      <button type="button" disabled={disabled} title="Przekreślenie (Strikethrough)" onClick={() => wrap('s')} style={{ ...btnStyle, textDecoration: 'line-through' }}>S</button>
    </div>
  )
}
