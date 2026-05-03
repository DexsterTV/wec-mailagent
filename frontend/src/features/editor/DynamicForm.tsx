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

        return (
          <details key={secName} className="form-section">
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
              {visibleFields.map((field) => (
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
