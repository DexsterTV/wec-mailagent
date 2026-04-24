import { useState, useEffect, useRef } from 'react'
import type { PressMapEntry, PressRole, TemplateField } from '../../types'

const PRESS_ROLES: { role: PressRole; label: string }[] = [
  { role: 'press_title',           label: 'Tytuł' },
  { role: 'press_hero_image',      label: 'Główne zdjęcie' },
  { role: 'press_excerpt',         label: 'Fragment / lead' },
  { role: 'press_date',            label: 'Data' },
  { role: 'press_category',        label: 'Kategoria' },
  { role: 'press_cta_button',      label: 'Przycisk CTA' },
  { role: 'press_cta_link',        label: 'Link CTA' },
  { role: 'press_secondary_image', label: 'Zdjęcie dodatkowe' },
  { role: 'press_secondary_cta',   label: 'Drugorzędny CTA' },
  { role: 'press_source_link',     label: 'Link źródłowy' },
]

// Script injected into iframe to enable click-to-map
const MAPPING_SCRIPT = `
(function() {
  var hovered = null;
  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var path = [];
    var cur = el;
    while (cur && cur !== document.body) {
      var seg = cur.tagName.toLowerCase();
      if (cur.className && typeof cur.className === 'string') {
        var cls = Array.from(cur.classList).filter(function(c) { return !/^(ip|wec|row|col|container|wrapper)$/i.test(c); }).slice(0, 2).join('.');
        if (cls) seg += '.' + cls;
      }
      var parent = cur.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === cur.tagName; });
        if (siblings.length > 1) seg += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
      }
      path.unshift(seg);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  }
  document.addEventListener('mouseover', function(e) {
    if (hovered && hovered !== e.target) hovered.style.outline = '';
    hovered = e.target;
    hovered.style.outline = '2px dashed #4f46e5';
    hovered.style.outlineOffset = '1px';
  });
  document.addEventListener('mouseout', function(e) {
    if (hovered === e.target) { hovered.style.outline = ''; hovered = null; }
  });
  document.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: 'PRESS_ELEMENT_CLICK', selector: getSelector(e.target), tagName: e.target.tagName.toLowerCase() }, '*');
  }, true);
})();
`

/** Replace {{fieldId}} placeholders with readable labels / defaults */
function buildPreviewHtml(html: string, fields: TemplateField[]): string {
  let preview = html
  for (const f of fields) {
    const escaped = f.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\{\\{${escaped}\\}\\}`, 'g')
    const replacement = f.default?.trim()
      ? f.default.trim()
      : `[${f.label}]`
    preview = preview.replace(re, replacement)
  }
  return preview
}

interface PressMappingPanelProps {
  html: string
  fields: TemplateField[]
  pressMappings: PressMapEntry[]
  onChange: (mappings: PressMapEntry[]) => void
}

export default function PressMappingPanel({ html, fields, pressMappings, onChange }: PressMappingPanelProps) {
  const [mappings,         setMappings]         = useState<PressMapEntry[]>(pressMappings)
  const [pendingSelector,  setPendingSelector]  = useState<string | null>(null)
  const [mappingMode,      setMappingMode]      = useState(false)
  const [dialogInstance,   setDialogInstance]   = useState<1 | 2>(1)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => { setMappings(pressMappings) }, [pressMappings])

  // Write iframe content when mode or html changes
  useEffect(() => {
    const frame = iframeRef.current
    if (!frame || !html) return

    // Substitute placeholders so editor can see real content
    const previewHtml = buildPreviewHtml(html, fields)
    const injected = mappingMode
      ? previewHtml.replace('</body>', `<script>${MAPPING_SCRIPT}</script></body>`)
      : previewHtml
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (doc) { doc.open(); doc.write(injected); doc.close() }

    if (mappingMode) {
      setTimeout(() => {
        mappings.forEach((m) => {
          try {
            const el = frame.contentDocument?.querySelector(m.selector) as HTMLElement | null
            if (el) { el.style.outline = '2px solid #10b981'; el.style.outlineOffset = '1px' }
          } catch {}
        })
      }, 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, fields, mappingMode])

  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'PRESS_ELEMENT_CLICK') {
        setPendingSelector(e.data.selector)
        setDialogInstance(1)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function assignRole(role: PressRole, instance: 1 | 2) {
    if (!pendingSelector) return
    const roleInfo = PRESS_ROLES.find((r) => r.role === role)!
    const newEntry: PressMapEntry = {
      id: `pm_${Date.now()}`,
      selector: pendingSelector,
      role,
      label: roleInfo.label,
      instance,
    }
    const updated = [...mappings.filter((m) => !(m.role === role && m.instance === instance)), newEntry]
    setMappings(updated)
    onChange(updated)
    setPendingSelector(null)

    try {
      const el = iframeRef.current?.contentDocument?.querySelector(pendingSelector) as HTMLElement | null
      if (el) { el.style.outline = '2px solid #10b981'; el.style.outlineOffset = '1px' }
    } catch {}
  }

  function removeMapping(id: string) {
    const updated = mappings.filter((m) => m.id !== id)
    setMappings(updated)
    onChange(updated)
  }

  const mappedKeys = new Set(mappings.map((m) => `${m.role}:${m.instance}`))
  const ip1 = mappings.filter((m) => m.instance === 1)
  const ip2 = mappings.filter((m) => m.instance === 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', borderBottom: '1px solid var(--panel-border)', marginBottom: 12,
      }}>
        <button
          className={`btn btn-sm ${mappingMode ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { setMappingMode((v) => !v); setPendingSelector(null) }}
          disabled={!html.trim()}
        >
          {mappingMode ? 'Zakończ mapowanie' : 'Włącz tryb mapowania'}
        </button>
        {mappingMode && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Kliknij element w podglądzie, aby przypisać rolę
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Iframe */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <iframe
            ref={iframeRef}
            title="Mapping Preview"
            style={{
              width: '100%', height: '100%', minHeight: 400,
              border: '1px solid var(--panel-border)', borderRadius: 6,
              cursor: mappingMode ? 'crosshair' : 'default',
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Right panel */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Role assignment dialog */}
          {pendingSelector && (
            <div style={{
              background: 'var(--bg-100)',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              padding: 12,
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Przypisz rolę do elementu
              </div>
              <div style={{
                fontSize: 10, fontFamily: 'Consolas, monospace',
                color: 'var(--text-muted)', marginBottom: 10,
                wordBreak: 'break-all', padding: '4px 6px',
                background: 'var(--bg-200)', borderRadius: 4,
              }}>
                {pendingSelector}
              </div>

              {/* Instance tabs */}
              <div style={{ display: 'flex', marginBottom: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                {([1, 2] as const).map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => setDialogInstance(inst)}
                    style={{
                      flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: dialogInstance === inst ? 600 : 400,
                      background: dialogInstance === inst ? (inst === 1 ? '#2563eb' : '#7c3aed') : 'var(--bg-0)',
                      color: dialogInstance === inst ? '#fff' : 'var(--text-muted)',
                      transition: 'background 0.15s',
                    }}
                  >
                    Informacja prasowa {inst}
                  </button>
                ))}
              </div>

              {/* Role list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PRESS_ROLES.map(({ role, label }) => {
                  const taken = mappedKeys.has(`${role}:${dialogInstance}`)
                  return (
                    <button
                      key={role}
                      className="btn btn-secondary btn-sm"
                      style={{ textAlign: 'left', justifyContent: 'space-between' }}
                      onClick={() => assignRole(role, dialogInstance)}
                    >
                      <span>{label}</span>
                      {taken && (
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>
                          (zastąpi)
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                className="btn btn-sm"
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => setPendingSelector(null)}
              >
                Anuluj
              </button>
            </div>
          )}

          {/* Mappings list grouped by instance */}
          {([1, 2] as const).map((inst) => {
            const group = inst === 1 ? ip1 : ip2
            const instColor = inst === 1 ? '#2563eb' : '#7c3aed'
            return (
              <div key={inst}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: instColor,
                  marginBottom: 6, paddingBottom: 4,
                  borderBottom: `2px solid ${instColor}33`,
                }}>
                  Informacja prasowa {inst}
                  <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-muted)' }}>
                    ({group.length}/{PRESS_ROLES.length})
                  </span>
                </div>
                {group.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Brak mapowań
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {group.map((m) => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                        padding: '5px 8px',
                        background: 'var(--bg-100)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: 5,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-900)' }}>
                            {m.label}
                          </div>
                          <div style={{
                            fontSize: 9, fontFamily: 'Consolas, monospace',
                            color: 'var(--text-muted)', wordBreak: 'break-all', marginTop: 2,
                          }}>
                            {m.selector}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{ padding: '1px 5px', fontSize: 11, flexShrink: 0 }}
                          onClick={() => removeMapping(m.id)}
                          title="Usuń"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Status checklist — both instances */}
          <div>
            <div style={{
              fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8,
            }}>
              Status ról
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {([1, 2] as const).map((inst) => (
                <div key={inst}>
                  <div style={{
                    fontSize: 10,
                    color: inst === 1 ? '#2563eb' : '#7c3aed',
                    marginBottom: 4,
                    fontWeight: 700,
                  }}>
                    IP {inst}
                  </div>
                  {PRESS_ROLES.map(({ role, label }) => {
                    const done = mappedKeys.has(`${role}:${inst}`)
                    return (
                      <div key={role} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', marginBottom: 3,
                        color: done ? 'var(--text-900)' : 'var(--text-muted)',
                      }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: done ? '#10b981' : 'var(--bg-200)',
                          border: '1px solid var(--panel-border)',
                          display: 'inline-block',
                        }} />
                        {label}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
