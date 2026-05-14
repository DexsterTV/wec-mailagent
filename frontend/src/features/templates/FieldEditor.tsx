import type { TemplateField, FieldType } from '../../types'

const SECTIONS = ['Ogólne', 'Nagłówek', 'Treść', 'Materiały prasowe', 'Opcje', 'Stopka']

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Tekst' },
  { value: 'textarea', label: 'Długi tekst' },
  { value: 'image-url', label: 'URL obrazu' },
  { value: 'color', label: 'Kolor' },
  { value: 'boolean', label: 'Przełącznik (tak/nie)' },
  { value: 'contact-select', label: 'Wybór kontaktu PR' },
]

const AUTOFILL_OPTIONS = [
  { value: '', label: '— brak —' },
  { value: 'name', label: 'Imię i Nazwisko' },
  { value: 'position', label: 'Stanowisko' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefon' },
]

interface Props {
  field: TemplateField
  index: number
  onChange: (index: number, field: TemplateField) => void
  onRemove: (index: number) => void
}

export default function FieldEditor({ field, index, onChange, onRemove }: Props) {
  function set<K extends keyof TemplateField>(key: K, value: TemplateField[K]) {
    onChange(index, { ...field, [key]: value })
  }

  return (
    <div className="admin-field-row" style={{ border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', padding: 12, background: 'var(--workspace-bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.75rem' }}>ID pola</label>
          <input
            className="field-setting-id"
            type="text"
            value={field.id}
            placeholder="np. heroImage"
            onChange={(e) => set('id', e.target.value.trim())}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.75rem' }}>Etykieta</label>
          <input
            className="field-setting-label"
            type="text"
            value={field.label}
            onChange={(e) => set('label', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.75rem' }}>Typ</label>
          <select
            className="field-setting-type"
            value={field.type}
            onChange={(e) => set('type', e.target.value as FieldType)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {field.type === 'color' ? (
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Domyślny kolor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 5,
                  background: /^#[0-9a-f]{6}$/i.test(field.default ?? '') ? field.default : '#ffffff',
                  border: '2px solid var(--panel-border)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }} />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(field.default ?? '') ? (field.default ?? '#ffffff') : '#ffffff'}
                  onChange={(e) => set('default', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  tabIndex={-1}
                />
              </label>
              <input
                className="field-setting-default"
                type="text"
                value={field.default !== undefined ? String(field.default) : ''}
                placeholder="#000000"
                maxLength={7}
                onChange={(e) => set('default', e.target.value)}
                style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}
              />
            </div>
          </div>
        ) : (
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Domyślna wartość</label>
            <input
              className="field-setting-default"
              type="text"
              value={field.default !== undefined ? String(field.default) : ''}
              onChange={(e) => set('default', e.target.value)}
            />
          </div>
        )}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.75rem' }}>Sekcja w edytorze</label>
          <select
            className="field-setting-section"
            value={field.section ?? 'Ogólne'}
            onChange={(e) => set('section', e.target.value)}
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.75rem' }}>Autofill (pole kontaktu)</label>
          <select
            className="field-setting-autofill"
            value={field.autofill ?? ''}
            onChange={(e) => set('autofill', e.target.value)}
          >
            {AUTOFILL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="checkbox-group" style={{ margin: 0 }}>
          <input
            className="field-setting-locked"
            type="checkbox"
            id={`locked-${index}`}
            checked={!!field.locked}
            onChange={(e) => set('locked' as keyof TemplateField, e.target.checked as never)}
          />
          <label htmlFor={`locked-${index}`} style={{ fontSize: '0.8rem' }}>Zablokowane (readonly)</label>
        </div>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>
          Usuń pole
        </button>
      </div>
    </div>
  )
}
