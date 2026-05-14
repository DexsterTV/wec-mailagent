import { useState, useEffect } from 'react'
import { extractFonts } from '../../lib/utils/fontExtractor'
import { replaceFontInHtml } from '../../lib/utils/fontReplacer'
import type { DetectedFont } from '../../types'

const SYSTEM_FONTS: { label: string; value: string }[] = [
  { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, Tahoma, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Arial, Helvetica, sans-serif" },
  { label: 'Segoe UI (Windows)', value: "'Segoe UI', Arial, sans-serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', Times, serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, Georgia, serif" },
  { label: 'Palatino', value: "'Palatino Linotype', Palatino, Georgia, serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" },
  { label: 'Impact', value: "Impact, 'Arial Black', sans-serif" },
]

const PREVIEW_SENTENCE = 'Zażółć gęślą jaźń. The quick brown fox.'

interface FontEditorProps {
  html: string
  fontMappings: DetectedFont[]
  onChange: (newHtml: string, newMappings: DetectedFont[]) => void
}

export default function FontEditor({ html, fontMappings, onChange }: FontEditorProps) {
  const [fonts, setFonts] = useState<DetectedFont[]>(fontMappings)
  const [scanned, setScanned] = useState(fontMappings.length > 0)

  useEffect(() => {
    setFonts(fontMappings)
    setScanned(fontMappings.length > 0)
  }, [fontMappings])

  function handleScan() {
    const detected = extractFonts(html)
    if (detected.length === 0) {
      alert('Nie znaleziono deklaracji font-family w kodzie HTML szablonu.')
      return
    }
    setFonts(detected)
    setScanned(true)
    onChange(html, detected)
  }

  function handleFontChange(index: number, newFamily: string) {
    const font = fonts[index]
    const newHtml = replaceFontInHtml(html, font.rawForms, newFamily)
    const updatedFonts = fonts.map((f, i) =>
      i === index ? { ...f, family: newFamily, rawForms: [newFamily] } : f
    )
    setFonts(updatedFonts)
    onChange(newHtml, updatedFonts)
  }

  if (!scanned) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          Kliknij „Skanuj czcionki", aby wykryć fonty użyte w szablonie.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={!html.trim()}>
          Skanuj czcionki
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Znaleziono {fonts.length} {fonts.length === 1 ? 'czcionkę' : 'czcionki'}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleScan}>
          Skanuj ponownie
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fonts.map((font, index) => (
          <FontRow
            key={font.family + index}
            font={font}
            rank={index + 1}
            total={fonts.length}
            onChange={(newFamily) => handleFontChange(index, newFamily)}
          />
        ))}
      </div>
    </div>
  )
}

interface FontRowProps {
  font: DetectedFont
  rank: number
  total: number
  onChange: (newFamily: string) => void
}

function FontRow({ font, rank, total, onChange }: FontRowProps) {
  const label = total > 1 ? `Czcionka ${rank} z ${total} (użyta ${font.count}×)` : `Użyta ${font.count}×`

  return (
    <div style={{
      borderRadius: 6,
      background: 'var(--bg-100)',
      border: '1px solid var(--panel-border)',
      overflow: 'hidden',
    }}>
      {/* Preview sentence in this font */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--panel-border)',
        background: 'var(--panel-bg)',
        fontFamily: font.family,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--text-900)',
      }}>
        {PREVIEW_SENTENCE}
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--text-400)' }}>{label}</div>
        <select
          value={SYSTEM_FONTS.find(f => f.value === font.family)?.value ?? ''}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          style={{
            fontSize: '0.8rem',
            padding: '5px 8px',
            border: '1px solid var(--panel-border)',
            borderRadius: 4,
            background: 'var(--bg-0)',
            color: 'var(--text-700)',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <option value="">— wybierz czcionkę —</option>
          {SYSTEM_FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
