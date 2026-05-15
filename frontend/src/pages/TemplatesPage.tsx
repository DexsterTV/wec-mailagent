import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { useTemplates } from '../features/editor/useTemplateStore'
import { useAuth } from '../lib/auth'
import { logsApi } from '../lib/api/logs'
import { smartHtmlTransformer, scanHtmlForVars } from '../lib/utils/smartHtmlTransformer'
import { mergeTemplateMetadata } from '../lib/utils/templateEditor'
import { DEFAULT_TEMPLATES } from '../lib/utils/defaultTemplates'
import { renderTemplate } from '../lib/utils/engine'
import FieldEditor from '../features/templates/FieldEditor'
import PressMappingPanel from '../features/templates/PressMappingPanel'
import DocxButtonPanel from '../features/templates/DocxButtonPanel'
import ColorEditor from '../features/templates/ColorEditor'
import FontEditor from '../features/templates/FontEditor'
import TypographyEditor from '../features/templates/TypographyEditor'
import type { Template, TemplateField, PressMapEntry, DetectedColor, DetectedFont, DetectedTypographyValue } from '../types'

function emptyField(): TemplateField {
  return { id: '', label: '', type: 'text', default: '', section: 'Ogólne' }
}

type EditorTab = 'content' | 'mapping' | 'docx' | 'appearance'

const FIELD_SECTION_ORDER = ['Nagłówek', 'Treść', 'Materiały prasowe', 'Opcje', 'Stopka', 'Ogólne']

function getFieldSectionName(field: TemplateField) {
  return field.section?.trim() || 'Ogólne'
}

function sortFieldSections(sections: string[]) {
  return [...sections].sort((a, b) => {
    let ia = FIELD_SECTION_ORDER.indexOf(a)
    let ib = FIELD_SECTION_ORDER.indexOf(b)

    if (ia === -1) ia = 99
    if (ib === -1) ib = 99

    return ia - ib
  })
}

function groupFieldsBySection(fields: TemplateField[]) {
  const grouped = new Map<string, Array<{ field: TemplateField; index: number }>>()

  fields.forEach((field, index) => {
    const section = getFieldSectionName(field)
    const items = grouped.get(section) ?? []
    items.push({ field, index })
    grouped.set(section, items)
  })

  return sortFieldSections([...grouped.keys()]).map((section) => ({
    section,
    items: grouped.get(section) ?? [],
  }))
}

interface EditorPanelProps {
  template: Template | null
  onSave: (tpl: Template) => Promise<void>
  onCancel: () => void
}

function EditorPanel({ template, onSave, onCancel }: EditorPanelProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [html, setHtml] = useState(template?.html ?? '')
  const [fields, setFields] = useState<TemplateField[]>(template?.fields ?? [])
  const [pressMappings, setPressMappings] = useState<PressMapEntry[]>(template?.pressMappings ?? [])
  const [docxButtonSelector, setDocxButtonSelector] = useState<string>(template?.docxButtonSelector ?? '')
  const [colorMappings, setColorMappings] = useState<DetectedColor[]>(template?.colorMappings ?? [])
  const [fontMappings, setFontMappings] = useState<DetectedFont[]>(template?.fontMappings ?? [])
  const [typographyMappings, setTypographyMappings] = useState<DetectedTypographyValue[]>(template?.typographyMappings ?? [])
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const previewRef = useRef<HTMLIFrameElement>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>('content')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const editingId = template?.id ?? null
  const groupedFields = groupFieldsBySection(fields)

  // Update appearance preview whenever html or fields change.
  // Same imperative doc.write pattern as EditorPage — proven reliable.
  useEffect(() => {
    if (activeTab !== 'appearance') return
    const frame = previewRef.current
    if (!frame || !html.trim()) return
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (!doc) return

    const defaults: Record<string, string> = {}
    fields.forEach((f) => { defaults[f.id] = f.default !== undefined ? String(f.default) : '' })
    const rendered = renderTemplate(html, defaults, {})

    doc.open()
    doc.write(rendered)
    doc.close()
  }, [html, activeTab, fields])

  function addField() {
    setFields((prev) => [...prev, emptyField()])
  }

  function updateField(index: number, field: TemplateField) {
    setFields((prev) => prev.map((item, itemIndex) => (itemIndex === index ? field : item)))
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function handleUploadHtml(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setHtml(reader.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleScanTags() {
    if (!html.trim()) {
      alert('Proszę najpierw wgrać lub wpisać kod HTML.')
      return
    }

    const { vars, types, defaults } = scanHtmlForVars(html)

    if (vars.size === 0) {
      if (confirm('Nie znaleziono własnych tagów. Użyć Smart Transformera?')) {
        const result = smartHtmlTransformer(html)
        setHtml(result.newHtml)

        const existingIds = new Set(fields.map((field) => field.id))
        const newFields = result.fields.filter((field) => !existingIds.has(field.id))
        setFields((prev) => [...prev, ...newFields])
        alert(`Transformacja gotowa! Utworzono ${result.fields.length} zmiennych.`)
      }
      return
    }

    const existingIds = new Set(fields.map((field) => field.id))
    const newFields: TemplateField[] = []

    vars.forEach((varName) => {
      if (!existingIds.has(varName)) {
        newFields.push({
          id: varName,
          label: varName.charAt(0).toUpperCase() + varName.slice(1),
          type: (types[varName] as TemplateField['type']) || 'text',
          default: defaults[varName] !== undefined ? String(defaults[varName]) : '',
        })
      }
    })

    setFields((prev) => [...prev, ...newFields])
    alert(`Skanowanie gotowe! ${vars.size} zmiennych (nowych: ${newFields.length}).`)
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Podaj nazwę szablonu.')
      return
    }

    if (!html.trim()) {
      alert('Szablon musi zawierać kod HTML.')
      return
    }

    const id = editingId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const validFields = fields.filter((field) => field.id.trim())

    setSaving(true)
    try {
      await onSave({
        ...(template ?? {}),
        id,
        name: name.trim(),
        fields: validFields,
        html,
        pressMappings: pressMappings.length > 0 ? pressMappings : undefined,
        docxButtonSelector: docxButtonSelector.trim() || undefined,
        colorMappings: colorMappings.length > 0 ? colorMappings : undefined,
        fontMappings: fontMappings.length > 0 ? fontMappings : undefined,
        typographyMappings: typographyMappings.length > 0 ? typographyMappings : undefined,
      })
      setSavedMsg('Zapisano!')
      setTimeout(() => setSavedMsg(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="split-right-topbar">
        <span className="split-right-title">Kreator szablonu</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {savedMsg && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ✓ {savedMsg}
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz szablon'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--panel-border)',
          padding: '0 16px',
          background: 'var(--bg-0)',
          flexShrink: 0,
        }}
      >
        {(['content', 'appearance', 'mapping', 'docx'] as EditorTab[]).map((tab) => {
          const labels: Record<EditorTab, string> = {
            content: 'Treść',
            appearance: 'Wygląd',
            mapping: 'Mapowanie prasowe',
            docx: 'Przycisk .docx',
          }

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {labels[tab]}
              {tab === 'appearance' && (colorMappings.length > 0 || fontMappings.length > 0) && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#8b5cf6', color: '#fff', borderRadius: 8, padding: '1px 5px' }}>
                  {colorMappings.length + fontMappings.length}
                </span>
              )}
              {tab === 'mapping' && pressMappings.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#10b981', color: '#fff', borderRadius: 8, padding: '1px 5px' }}>
                  {pressMappings.length}
                </span>
              )}
              {tab === 'docx' && docxButtonSelector && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#f59e0b', color: '#fff', borderRadius: 8, padding: '1px 5px' }}>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div
        className="split-right-body"
        style={{
          minHeight: 0,
          ...(activeTab === 'appearance' && {
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
          }),
        }}
      >
        {activeTab === 'content' && (
          <>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="tpl-name">Nazwa szablonu</label>
              <input
                id="tpl-name"
                type="text"
                value={name}
                placeholder="np. Mój Nowy Szablon"
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 6,
                }}
              >
                <label htmlFor="tpl-html" style={{ margin: 0 }}>
                  Kod źródłowy HTML{' '}
                  <code style={{ fontSize: 11, fontWeight: 400 }}>
                    (&#123;&#123;zmienna&#125;&#125;, &lt;!--[if:warunek]--&gt;)
                  </code>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginBottom: 0 }}>
                    Wgraj HTML
                    <input type="file" accept=".html,.txt" style={{ display: 'none' }} onChange={handleUploadHtml} />
                  </label>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleScanTags}>
                    Skanuj tagi
                  </button>
                </div>
              </div>
              <textarea
                id="tpl-html"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                style={{ fontFamily: 'Consolas,monospace', fontSize: 12, minHeight: 220, width: '100%' }}
                required
              />
            </div>

            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--panel-border)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-900)', margin: 0 }}>Pola formularza</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addField}>
                + Dodaj pole
              </button>
            </div>

            {fields.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupedFields.map(({ section, items }) => (
                  <details key={section} className="form-section" data-section={section} open>
                    <summary className="form-section-header">
                      <span className="form-section-title">
                        {section}
                        <span className="badge badge-neutral" style={{ marginLeft: 8, fontWeight: 500 }}>
                          {items.length}
                        </span>
                      </span>
                      <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="form-section-body template-field-list">
                      {items.map(({ field, index }) => (
                        <FieldEditor
                          key={`${section}-${field.id || 'field'}-${index}`}
                          field={field}
                          index={index}
                          onChange={updateField}
                          onRemove={removeField}
                        />
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Brak pól. Kliknij „+ Dodaj pole" lub użyj „Skanuj tagi".
              </p>
            )}
          </>
        )}

        {activeTab === 'mapping' && (
          <PressMappingPanel
            html={html}
            fields={fields}
            pressMappings={pressMappings}
            onChange={setPressMappings}
          />
        )}

        {activeTab === 'appearance' && (
          <div className="appearance-split">
            {/* LEFT — scrollable controls */}
            <div className="appearance-left">
              <div className="appearance-left-inner">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                  Zmiany są zapisywane trwale w kodzie HTML szablonu. Podgląd na żywo po prawej.
                </p>

                <details className="form-section" data-section="Kolory" open>
                  <summary className="form-section-header">
                    <span className="form-section-title">
                      Kolory
                      {colorMappings.length > 0 && (
                        <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{colorMappings.length}</span>
                      )}
                    </span>
                    <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="form-section-body template-field-list">
                    <ColorEditor
                      html={html}
                      colorMappings={colorMappings}
                      onChange={(newHtml, newMappings) => { setHtml(newHtml); setColorMappings(newMappings) }}
                    />
                  </div>
                </details>

                <details className="form-section" data-section="Czcionki">
                  <summary className="form-section-header">
                    <span className="form-section-title">
                      Czcionki
                      {fontMappings.length > 0 && (
                        <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{fontMappings.length}</span>
                      )}
                    </span>
                    <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="form-section-body template-field-list">
                    <FontEditor
                      html={html}
                      fontMappings={fontMappings}
                      onChange={(newHtml, newMappings) => { setHtml(newHtml); setFontMappings(newMappings) }}
                    />
                  </div>
                </details>

                <details className="form-section" data-section="Typografia">
                  <summary className="form-section-header">
                    <span className="form-section-title">
                      Typografia
                      {typographyMappings.length > 0 && (
                        <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{typographyMappings.length}</span>
                      )}
                    </span>
                    <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="form-section-body template-field-list">
                    <TypographyEditor
                      html={html}
                      typographyMappings={typographyMappings}
                      onChange={(newHtml, newMappings) => { setHtml(newHtml); setTypographyMappings(newMappings) }}
                    />
                  </div>
                </details>
              </div>
            </div>

            {/* RIGHT — live preview */}
            <div className="appearance-right">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderBottom: '1px solid var(--panel-border)',
                background: 'var(--panel-bg)',
                flexShrink: 0,
              }}>
                <div className="preview-toggles">
                  <button className={`toggle-btn${previewMode === 'desktop' ? ' active' : ''}`} onClick={() => setPreviewMode('desktop')}>Desktop</button>
                  <button className={`toggle-btn${previewMode === 'mobile' ? ' active' : ''}`} onClick={() => setPreviewMode('mobile')}>Mobile</button>
                </div>
                {!html.trim() && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                    Wgraj HTML, aby zobaczyc podglad
                  </span>
                )}
              </div>
              <div className={`preview-container ${previewMode}`} style={{ flex: 1, overflow: 'auto' }}>
                <iframe ref={previewRef} title="Podglad szablonu" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docx' && (
          <DocxButtonPanel
            html={html}
            fields={fields}
            selector={docxButtonSelector}
            onChange={setDocxButtonSelector}
          />
        )}
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const { templates, saveTemplate, deleteTemplate } = useTemplates()
  const { hasPermission, user } = useAuth()
  const canEdit = hasPermission('canEditTemplates')
  const [editing, setEditing] = useState<Template | null | undefined>(undefined)

  async function handleSave(tpl: Template) {
    const existingTemplate = templates.find((template) => template.id === tpl.id)
    const defaultTemplate = DEFAULT_TEMPLATES.find((template) => template.id === tpl.id)
    const toSave = mergeTemplateMetadata({
      nextTemplate: tpl,
      existingTemplate,
      defaultTemplate,
      currentUser: user?.displayName,
    })

    await saveTemplate(toSave)
    logsApi.add('TEMPLATE_SAVE', `Zapisano szablon: ${tpl.name} (ID: ${tpl.id})`)
    setEditing(toSave)
  }

  async function handleDelete(tpl: Template) {
    if (!confirm(`Czy na pewno usunąć szablon „${tpl.name}"?`)) return
    await deleteTemplate(tpl.id)
    logsApi.add('TEMPLATE_DELETE', `Usunięto szablon: ${tpl.name}`)

    if ((editing as Template | null)?.id === tpl.id) {
      setEditing(undefined)
    }
  }

  async function handleDuplicate(tpl: Template) {
    const copyName = `${tpl.name} (kopia)`
    const copyId = `${tpl.id}-kopia-${Date.now()}`
    const copy: Template = {
      ...tpl,
      id: copyId,
      name: copyName,
      createdBy: user?.displayName ?? 'Nieznany',
      createdAt: new Date().toISOString(),
    }

    await saveTemplate(copy)
    logsApi.add('TEMPLATE_SAVE', `Zduplikowano szablon: ${tpl.name} → ${copyName}`)
    setEditing(copy)
  }

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Menedżer szablonów</span>
        </div>
        <div className="topbar-right">
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>
              + Utwórz szablon
            </button>
          )}
        </div>
      </div>

      <div className="split-layout">
        <aside className="split-left">
          <div className="split-left-body">
            {templates.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9rem', padding: '8px 0' }}>Brak szablonów.</p>
            ) : (
              <div className="contacts-list">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`contact-card${editing && (editing as Template).id === tpl.id ? ' selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEditing(tpl)}
                  >
                    <div className="contact-info">
                      <strong>{tpl.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tpl.fields.length} pól · ID: {tpl.id}
                      </span>
                      {tpl.createdBy && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-400)' }}>
                          Autor: {tpl.createdBy}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="contact-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" title="Duplikuj szablon" onClick={() => handleDuplicate(tpl)}>
                          Duplikuj
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl)}>
                          Usuń
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="split-right" style={{ display: 'flex', flexDirection: 'column' }}>
          {editing === undefined ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <svg className="empty-state-icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <p>Wybierz szablon z listy lub utwórz nowy.</p>
            </div>
          ) : canEdit ? (
            <EditorPanel
              key={editing ? (editing as Template).id : 'new'}
              template={editing as Template | null}
              onSave={handleSave}
              onCancel={() => setEditing(undefined)}
            />
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <p>Nie masz uprawnień do edycji szablonów.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
