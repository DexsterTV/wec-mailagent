import { useState, useEffect, useRef } from 'react'
import { useTemplates } from '../features/editor/useTemplateStore'
import { useContacts } from '../features/contacts/useContacts'
import DynamicForm from '../features/editor/DynamicForm'
import { renderTemplate } from '../lib/utils/engine'
import { getRenderableValues, decorateImageTags } from '../lib/utils/templateUtils'
import { extractColors } from '../lib/utils/colorExtractor'
import { replaceColorInHtml } from '../lib/utils/colorReplacer'
import { drafts } from '../lib/utils/drafts'
import { logsApi } from '../lib/api/logs'
import { injectPressData, injectDocxButton } from '../lib/utils/pressInjector'
import { usePressDocx } from '../features/press/usePressDocx'
import ProwlyPicker from '../features/press/ProwlyPicker'
import type { Template, TemplateField, Contact, DetectedColor, ProwlyPost } from '../types'

function buildContactHtml(c: Contact): string {
  const lines: string[] = []
  if (c.name) lines.push(`<strong>${c.name}</strong>`)
  if (c.position) lines.push(c.position)
  if (c.email) lines.push(`<a href="mailto:${c.email}">${c.email}</a>`)
  if (c.phone) lines.push(c.phone)
  return lines.join('<br>')
}

function injectPreviewHelpers(html: string): string {
  const inject = `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:;">
<base target="_blank">`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1\n${inject}`)
  }
  return inject + html
}

function getDefaultValues(template: Template): Record<string, string> {
  const vals: Record<string, string> = {}
  template.fields.forEach((f) => {
    vals[f.id] = f.default !== undefined ? String(f.default) : ''
  })
  return vals
}

// ─── Color panel ─────────────────────────────────────────────────────────────

interface ColorPanelProps {
  colors: DetectedColor[]
  overrides: Record<string, string>
  onOverride: (originalHex: string, newHex: string) => void
}

function ColorPanel({ colors, overrides, onOverride }: ColorPanelProps) {
  const [hexInputs, setHexInputs] = useState<Record<string, string>>({})

  if (colors.length === 0) {
    return (
      <p style={{ padding: '8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Ten szablon nie zawiera wykrywalnych kolorów.
      </p>
    )
  }

  const grouped = colors.reduce<Record<string, DetectedColor[]>>((acc, c) => {
    const key = c.label
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([groupLabel, groupColors]) => (
        <div key={groupLabel}>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}>
            {groupLabel}
          </div>
          {groupColors.map((color) => {
            const currentHex = overrides[color.hex] ?? color.hex
            const inputVal = hexInputs[color.hex] ?? currentHex

            return (
              <div key={color.hex} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}>
                {/* Swatch — clicking opens native color picker via hidden input */}
                <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 5,
                    background: currentHex,
                    border: '2px solid var(--panel-border)',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                  }} />
                  <input
                    type="color"
                    value={currentHex}
                    onChange={(e) => {
                      onOverride(color.hex, e.target.value)
                      setHexInputs((p) => ({ ...p, [color.hex]: e.target.value }))
                    }}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    tabIndex={-1}
                  />
                </label>

                {/* Hex input */}
                <input
                  type="text"
                  value={inputVal}
                  maxLength={9}
                  onChange={(e) => {
                    setHexInputs((p) => ({ ...p, [color.hex]: e.target.value }))
                    const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) onOverride(color.hex, v.toLowerCase())
                  }}
                  onBlur={() => setHexInputs((p) => ({ ...p, [color.hex]: currentHex }))}
                  style={{
                    width: 76,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 11,
                    padding: '3px 6px',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 4,
                    background: 'var(--bg-0)',
                    color: 'var(--text-900)',
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Wystąpienia: {color.count}
                  </div>
                </div>

                {/* Reset button — only if overridden */}
                {overrides[color.hex] && (
                  <button
                    title="Przywróć oryginalny kolor"
                    aria-label="Przywróć oryginalny kolor"
                    onClick={() => {
                      onOverride(color.hex, color.hex)
                      setHexInputs((p) => ({ ...p, [color.hex]: color.hex }))
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      padding: '0 2px',
                      flexShrink: 0,
                    }}
                  >
                    ↺
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── EditorPage ───────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { templates, isLoading } = useTemplates()
  const { contacts } = useContacts()
  const [selectedId, setSelectedId] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [autosaveMsg, setAutosaveMsg] = useState('')
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([])
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({})
  const [selectedPosts, setSelectedPosts] = useState<[ProwlyPost | null, ProwlyPost | null]>([null, null])
  const [pressUrl, setPressUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const { docxUrl, resolving: docxResolving } = usePressDocx(pressUrl)
  const [formOpen, setFormOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentTemplate = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null

  // Load template + draft on selection change
  useEffect(() => {
    if (!currentTemplate) return
    setSelectedId(currentTemplate.id)
    const draft = drafts.get(currentTemplate.id)
    if (draft) {
      setValues(draft)
    } else {
      const defaults = getDefaultValues(currentTemplate)
      const contactSelectFields = currentTemplate.fields.filter((f) => f.type === 'contact-select')
      const anySelected = contactSelectFields.some((f) => defaults[f.id])
      if (!anySelected) {
        currentTemplate.fields.forEach((f) => {
          if (f.autofill) defaults[f.id] = ''
        })
      }
      setValues(defaults)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, templates.length])

  // Initial selection
  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id)
    }
  }, [templates, selectedId])

  // Detect colors when template changes
  useEffect(() => {
    if (!currentTemplate) return
    setDetectedColors(extractColors(currentTemplate.html))
    setColorOverrides({})
    setSelectedPosts([null, null])
    setPressUrl('')
  }, [currentTemplate?.id])

  // Apply color overrides to base HTML before rendering
  function getBaseHtml(): string {
    if (!currentTemplate) return ''
    let html = currentTemplate.html
    for (const color of detectedColors) {
      const override = colorOverrides[color.hex]
      if (override && override !== color.hex) {
        html = replaceColorInHtml(html, color.rawForms, override)
      }
    }
    return html
  }

  function getFinalHtml(): string {
    if (!currentTemplate) return ''
    const baseHtml = getBaseHtml()
    const renderableValues = getRenderableValues(currentTemplate, values)
    const rawValues: Record<string, string> = {}
    currentTemplate.fields.forEach((f) => {
      if (f.type === 'contact-select') {
        const contactId = values[f.id]
        const contact = contactId ? contacts.find((c) => c.id === contactId) : null
        rawValues[f.id] = contact ? buildContactHtml(contact) : ''
      }
    })
    rawValues.link_docx = docxUrl
    const rendered = decorateImageTags(renderTemplate(baseHtml, renderableValues, rawValues))
    const withPress = injectPressData(rendered, currentTemplate.pressMappings, selectedPosts)
    return injectDocxButton(withPress, currentTemplate.docxButtonSelector, docxUrl)
  }

  // Update iframe preview
  useEffect(() => {
    const frame = iframeRef.current
    if (!frame || !currentTemplate) return
    const html = injectPreviewHelpers(getFinalHtml())
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, currentTemplate, colorOverrides, selectedPosts, docxUrl])

  function scheduleAutosave(newValues: Record<string, string>) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      if (currentTemplate) {
        drafts.save(currentTemplate.id, newValues)
        setAutosaveMsg('Zapisano szkic')
        setTimeout(() => setAutosaveMsg(''), 2000)
      }
    }, 800)
  }

  function handleChange(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value }
      scheduleAutosave(next)
      return next
    })
  }

  function handleBooleanToggle(name: string, checked: boolean) {
    setValues((prev) => {
      const next = { ...prev, [name]: checked ? 'true' : 'false' }
      scheduleAutosave(next)
      return next
    })
  }

  function handleContactSelect(contactId: string, field: TemplateField) {
    setValues((prev) => {
      const next = { ...prev, [field.id]: contactId }
      if (contactId && currentTemplate) {
        const contact = contacts.find((c) => c.id === contactId)
        if (contact) {
          const contactMap = contact as unknown as Record<string, string>
          currentTemplate.fields.forEach((f) => {
            if (f.autofill && f.autofill !== '') {
              next[f.id] = contactMap[f.autofill] ?? ''
            }
          })
        }
      } else if (!contactId && currentTemplate) {
        currentTemplate.fields.forEach((f) => {
          if (f.autofill) next[f.id] = ''
        })
      }
      scheduleAutosave(next)
      return next
    })
  }

  function handleColorOverride(originalHex: string, newHex: string) {
    setColorOverrides((prev) => {
      const next = { ...prev, [originalHex]: newHex }
      // Clean up if reverted to original
      if (newHex === originalHex) delete next[originalHex]
      return next
    })
  }

  async function copyHTML() {
    const html = getFinalHtml()
    await navigator.clipboard.writeText(html)
    logsApi.add('EXPORT_COPY', `Skopiowano HTML: ${currentTemplate?.name}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadHTML() {
    const html = getFinalHtml()
    const requiredFields = currentTemplate?.fields.filter((f) => f.required) ?? []
    const missing = requiredFields.filter((f) => !values[f.id]?.trim())
    if (missing.length > 0) {
      alert(`Uwaga: puste wymagane pola:\n${missing.map((f) => f.label).join('\n')}`)
    }
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `mailing-${ts}.html`
    a.click()
    URL.revokeObjectURL(url)
    logsApi.add('EXPORT_DOWNLOAD', `Pobrano HTML: ${currentTemplate?.name}`)
  }

  function resetDraft() {
    if (!currentTemplate) return
    if (!confirm('Czy na pewno chcesz wyczyścić wszystkie wpisane dane w tym formularzu?')) return
    drafts.clear(currentTemplate.id)
    setValues(getDefaultValues(currentTemplate))
  }

  if (isLoading) {
    return (
      <div className="app-view active" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" />
            <p style={{ marginTop: 12, fontSize: '0.9rem' }}>Ładowanie danych…</p>
          </div>
        </div>
      </div>
    )
  }

  const overrideCount = Object.keys(colorOverrides).length

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Edytor mailingu</span>
          <div className="template-selector-topbar">
            <label htmlFor="template-select">Szablon:</label>
            <select
              id="template-select"
              value={selectedId}
              onChange={(e) => {
                const tpl = templates.find((t) => t.id === e.target.value)
                setSelectedId(e.target.value)
                if (tpl) logsApi.add('TEMPLATE_SELECT', `Wybrano szablon: ${tpl.name} (ID: ${tpl.id})`)
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-icon btn-sm" title="Resetuj formularz" aria-label="Resetuj formularz" onClick={resetDraft}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            className="btn btn-sm"
            onClick={copyHTML}
            style={{
              background: copied ? '#dcfce7' : undefined,
              borderColor: copied ? '#86efac' : undefined,
              color: copied ? '#16a34a' : undefined,
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
          >
            {copied ? '✓ Skopiowano!' : 'Skopiuj HTML'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={downloadHTML}>
            Pobierz HTML
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {/* LEFT PANEL — form */}
        <aside
          style={{
            display: 'flex', flexDirection: 'row',
            width: formOpen ? 320 : 28, minWidth: formOpen ? 280 : 28,
            background: 'var(--panel-bg)',
            borderRight: '1px solid var(--panel-border)',
            overflow: 'hidden',
            transition: 'width 0.25s ease, min-width 0.25s ease',
            cursor: formOpen ? 'default' : 'pointer',
            flexShrink: 0,
          }}
          onClick={() => !formOpen && setFormOpen(true)}
          title={formOpen ? undefined : 'Rozwiń panel formularza'}
        >
          {/* Form content */}
          <div className="editor-form-inner" style={{ flex: 1, minWidth: 0, display: formOpen ? 'block' : 'none' }}>
            {currentTemplate ? (
              <>
                <DynamicForm
                  template={currentTemplate}
                  values={values}
                  contacts={contacts}
                  onChange={handleChange}
                  onContactSelect={handleContactSelect}
                  onBooleanToggle={handleBooleanToggle}
                />
                {detectedColors.length > 0 && (
                  <details className="form-section" style={{ marginTop: 8 }}>
                    <summary className="form-section-header">
                      <span className="form-section-title">
                        Kolory motywu
                        {overrideCount > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '1px 6px', fontWeight: 600 }}>
                            {overrideCount} zm.
                          </span>
                        )}
                      </span>
                      <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="form-section-body">
                      <ColorPanel colors={detectedColors} overrides={colorOverrides} onOverride={handleColorOverride} />
                    </div>
                  </details>
                )}
                {currentTemplate.docxButtonSelector && (
                  <details className="form-section" style={{ marginTop: 8 }}>
                    <summary className="form-section-header">
                      <span className="form-section-title">
                        Pobieranie pliku .docx
                        {docxUrl && (
                          <span style={{ marginLeft: 8, fontSize: 10, background: '#f59e0b', color: '#fff', borderRadius: 8, padding: '1px 6px', fontWeight: 600 }}>
                            ✓
                          </span>
                        )}
                      </span>
                      <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="form-section-body">
                      <label htmlFor="docx-press-url" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Link do informacji prasowej (Prowly)
                      </label>
                      <input
                        id="docx-press-url"
                        type="url"
                        placeholder="https://media.wec24.pl/123456-tytul-artykulu"
                        value={pressUrl}
                        onChange={(e) => setPressUrl(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          fontSize: '0.8rem',
                          border: '1px solid var(--panel-border)',
                          borderRadius: 5,
                          background: 'var(--bg-0)',
                          color: 'var(--text-900)',
                          boxSizing: 'border-box',
                        }}
                      />
                      {pressUrl.trim() && (
                        <div style={{ marginTop: 5, fontSize: '0.75rem' }}>
                          {docxResolving && <span style={{ color: 'var(--text-muted)' }}>Pobieranie linku .docx…</span>}
                          {!docxResolving && docxUrl && <span style={{ color: '#16a34a' }}>✓ Link .docx gotowy — button w szablonie zaktualizowany</span>}
                          {!docxResolving && !docxUrl && <span style={{ color: '#ef4444' }}>Nie udało się pobrać linku .docx</span>}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <details className="form-section" style={{ marginTop: 8 }}>
                  <summary className="form-section-header">
                    <span className="form-section-title">
                      Informacje prasowe (Prowly)
                      {(selectedPosts[0] || selectedPosts[1]) && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '1px 6px', fontWeight: 600 }}>
                          {[selectedPosts[0], selectedPosts[1]].filter(Boolean).length} wyb.
                        </span>
                      )}
                    </span>
                    <svg className="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="form-section-body">
                    <ProwlyPicker
                      pressMappings={currentTemplate.pressMappings}
                      onSelect={(posts) => {
                        setSelectedPosts(posts)
                        const names = posts.map((p, i) => p ? `IP${i + 1}: ${p.title}` : `IP${i + 1}: brak`).join(' | ')
                        logsApi.add('PRESS_SELECT', `Wybrano prasówki w szablonie "${currentTemplate.name}": ${names}`)
                      }}
                    />
                  </div>
                </details>
              </>
            ) : (
              <p style={{ padding: 16, color: 'var(--text-muted)' }}>Brak szablonów. Dodaj szablon w zakładce Szablony.</p>
            )}
          </div>

          {/* Left toggle strip */}
          <div className="panel-toggle-strip" onClick={(e) => { if (formOpen) e.stopPropagation() }}>
            <button
              className="panel-toggle-btn"
              title={formOpen ? 'Zwiń panel formularza' : 'Rozwiń panel formularza'}
              onClick={(e) => { e.stopPropagation(); setFormOpen((v) => !v) }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none">
                <polyline points={formOpen ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
              </svg>
            </button>
          </div>
        </aside>

        {/* CENTER — preview */}
        <main
          className="editor-preview-panel"
          style={{
            flex: previewOpen ? 1 : 0,
            minWidth: previewOpen ? 0 : 0,
            width: previewOpen ? undefined : 0,
            overflow: 'hidden',
            transition: 'flex 0.25s ease',
          }}
        >
          <div className="preview-toolbar">
            <div className="preview-toggles">
              <button className={`toggle-btn${previewMode === 'desktop' ? ' active' : ''}`} onClick={() => setPreviewMode('desktop')}>Desktop</button>
              <button className={`toggle-btn${previewMode === 'mobile' ? ' active' : ''}`} onClick={() => setPreviewMode('mobile')}>Mobile</button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {autosaveMsg && <span className="autosave-indicator">{autosaveMsg}</span>}
            </div>
          </div>
          <div className={`preview-container ${previewMode}`}>
            <iframe ref={iframeRef} title="Live Preview" />
          </div>
        </main>

        {/* RIGHT toggle strip — collapses/expands preview */}
        <div
          className="panel-toggle-strip panel-toggle-strip--right"
          style={{ cursor: previewOpen ? 'default' : 'pointer' }}
          onClick={() => !previewOpen && setPreviewOpen(true)}
          title={previewOpen ? undefined : 'Rozwiń podgląd'}
        >
          <button
            className="panel-toggle-btn"
            title={previewOpen ? 'Zwiń podgląd' : 'Rozwiń podgląd'}
            onClick={(e) => { e.stopPropagation(); setPreviewOpen((v) => !v) }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none">
              <polyline points={previewOpen ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
