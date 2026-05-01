import { useState, useEffect, useRef } from 'react'
import type { TemplateField } from '../../types'

const DOCX_MAPPING_SCRIPT = `
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
    hovered.style.outline = '2px dashed #f59e0b';
    hovered.style.outlineOffset = '1px';
  });
  document.addEventListener('mouseout', function(e) {
    if (hovered === e.target) { hovered.style.outline = ''; hovered = null; }
  });
  document.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: 'DOCX_ELEMENT_CLICK', selector: getSelector(e.target) }, '*');
  }, true);
})();
`

function buildPreviewHtml(html: string, fields: TemplateField[]): string {
  let preview = html
  for (const f of fields) {
    const escaped = f.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\{\\{${escaped}\\}\\}`, 'g')
    preview = preview.replace(re, f.default?.trim() ? f.default.trim() : `[${f.label}]`)
  }
  return preview
}

interface DocxButtonPanelProps {
  html: string
  fields: TemplateField[]
  selector: string
  onChange: (selector: string) => void
}

export default function DocxButtonPanel({ html, fields, selector, onChange }: DocxButtonPanelProps) {
  const [pickingMode, setPickingMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const frame = iframeRef.current
    if (!frame || !html) return
    const previewHtml = buildPreviewHtml(html, fields)
    const injected = pickingMode
      ? previewHtml.replace('</body>', `<script>${DOCX_MAPPING_SCRIPT}</script></body>`)
      : previewHtml
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (doc) { doc.open(); doc.write(injected); doc.close() }

    if (!pickingMode && selector) {
      setTimeout(() => {
        try {
          const el = frame.contentDocument?.querySelector(selector) as HTMLElement | null
          if (el) { el.style.outline = '2px solid #f59e0b'; el.style.outlineOffset = '1px' }
        } catch {}
      }, 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, fields, pickingMode])

  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'DOCX_ELEMENT_CLICK') {
        onChange(e.data.selector as string)
        setPickingMode(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onChange])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', borderBottom: '1px solid var(--panel-border)', marginBottom: 12,
      }}>
        <button
          className={`btn btn-sm ${pickingMode ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setPickingMode((v) => !v)}
          disabled={!html.trim()}
        >
          {pickingMode ? 'Anuluj wybór' : 'Wskaż przycisk pobierania w szablonie'}
        </button>
        {pickingMode && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Kliknij element w podglądzie
          </span>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          Wybrany element przycisku .docx
        </div>
        {selector ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <code style={{
              flex: 1, fontSize: 10, fontFamily: 'Consolas, monospace',
              padding: '5px 8px', background: 'var(--bg-100)',
              border: '1px solid var(--panel-border)', borderRadius: 4,
              wordBreak: 'break-all', color: 'var(--text-900)',
            }}>
              {selector}
            </code>
            <button
              className="btn btn-sm"
              style={{ padding: '3px 7px', flexShrink: 0 }}
              onClick={() => onChange('')}
              title="Usuń selektor"
            >
              ✕
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Nie wybrano. Kliknij „Wskaż przycisk" i kliknij element w podglądzie.
          </p>
        )}
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text-400)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg-100)', borderRadius: 6, border: '1px solid var(--panel-border)' }}>
        Wybrany element będzie automatycznie dostawał <code style={{ fontSize: 10 }}>href</code> z linkiem do pliku .docx podanym przez agenta w edytorze mailingu.
      </div>

      <div style={{ flex: 1, minHeight: 400 }}>
        <iframe
          ref={iframeRef}
          title="Docx Button Picker"
          style={{
            width: '100%', height: '100%', minHeight: 400,
            border: '1px solid var(--panel-border)', borderRadius: 6,
            cursor: pickingMode ? 'crosshair' : 'default',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
