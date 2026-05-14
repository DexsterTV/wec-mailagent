import { useState, useEffect } from 'react'
import { extractTypography } from '../../lib/utils/typographyExtractor'
import { replaceCssPropertyValue } from '../../lib/utils/typographyReplacer'
import type { DetectedTypographyValue } from '../../types'

const PROP_LABELS: Record<string, string> = {
  'font-size': 'Rozmiar tekstu',
  'line-height': 'Interliinia',
  'letter-spacing': 'Odstępy liter',
}

const PROP_HINTS: Record<string, string> = {
  'font-size': 'np. 16px, 1rem',
  'line-height': 'np. 1.5, 24px',
  'letter-spacing': 'np. 0.5px, 0.05em',
}

interface TypographyEditorProps {
  html: string
  typographyMappings: DetectedTypographyValue[]
  onChange: (newHtml: string, newMappings: DetectedTypographyValue[]) => void
}

export default function TypographyEditor({ html, typographyMappings, onChange }: TypographyEditorProps) {
  const [items, setItems] = useState<DetectedTypographyValue[]>(typographyMappings)
  const [scanned, setScanned] = useState(typographyMappings.length > 0)

  useEffect(() => {
    setItems(typographyMappings)
    setScanned(typographyMappings.length > 0)
  }, [typographyMappings])

  function handleScan() {
    const detected = extractTypography(html)
    if (detected.length === 0) {
      alert('Nie znaleziono deklaracji font-size, line-height ani letter-spacing w kodzie HTML.')
      return
    }
    setItems(detected)
    setScanned(true)
    onChange(html, detected)
  }

  function handleValueChange(index: number, newValue: string) {
    const item = items[index]
    const newHtml = replaceCssPropertyValue(html, item.property, item.rawForms, newValue)
    const updated = items.map((it, i) =>
      i === index ? { ...it, value: newValue, rawForms: [newValue] } : it
    )
    setItems(updated)
    onChange(newHtml, updated)
  }

  if (!scanned) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          Kliknij „Skanuj typografię", aby wykryć rozmiary tekstu, interlinie i odstępy liter.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={!html.trim()}>
          Skanuj typografię
        </button>
      </div>
    )
  }

  const grouped = items.reduce<Record<string, Array<{ item: DetectedTypographyValue; index: number }>>>((acc, item, index) => {
    if (!acc[item.property]) acc[item.property] = []
    acc[item.property].push({ item, index })
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Znaleziono {items.length} wartości
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleScan}>
          Skanuj ponownie
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(grouped).map(([prop, entries]) => (
          <div key={prop}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: '1px solid var(--panel-border)',
            }}>
              {PROP_LABELS[prop] ?? prop}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(({ item, index }, i) => (
                <TypographyRow
                  key={`${prop}-${item.value}-${index}`}
                  item={item}
                  hint={PROP_HINTS[prop] ?? ''}
                  rank={i + 1}
                  total={entries.length}
                  onChange={(newVal) => handleValueChange(index, newVal)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TypographyRowProps {
  item: DetectedTypographyValue
  hint: string
  rank: number
  total: number
  onChange: (newValue: string) => void
}

function TypographyRow({ item, hint, rank, total, onChange }: TypographyRowProps) {
  const [inputVal, setInputVal] = useState(item.value)

  useEffect(() => {
    setInputVal(item.value)
  }, [item.value])

  function commit() {
    const trimmed = inputVal.trim()
    if (trimmed && trimmed !== item.value) onChange(trimmed)
  }

  const previewStyle: React.CSSProperties =
    item.property === 'font-size'
      ? { fontSize: item.value, lineHeight: 1.3 }
      : item.property === 'line-height'
      ? { fontSize: 10, lineHeight: item.value }
      : { fontSize: 12, letterSpacing: item.value }

  const previewText =
    item.property === 'font-size'
      ? 'Przykładowy tekst'
      : item.property === 'line-height'
      ? 'Przykładowy\ntekst wiadomości'
      : 'Przykładowy tekst'

  const label = total > 1
    ? `Wariant ${rank} z ${total} (użyty ${item.count}×)`
    : `Użyty ${item.count}×`

  return (
    <div style={{
      borderRadius: 6,
      background: 'var(--bg-100)',
      border: '1px solid var(--panel-border)',
      overflow: 'hidden',
    }}>
      {/* Static preview */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid var(--panel-border)',
        background: 'var(--panel-bg)',
        color: 'var(--text-700)',
        maxHeight: 64,
        overflow: 'hidden',
        whiteSpace: item.property === 'line-height' ? 'pre-line' : 'normal',
        ...previewStyle,
      }}>
        {previewText}
      </div>

      {/* Controls */}
      <div style={{ padding: '6px 8px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-400)', marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'Consolas, monospace',
            fontSize: 11,
            color: 'var(--text-400)',
            flexShrink: 0,
            minWidth: 36,
          }}>
            {item.value}
          </span>

          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="var(--text-300)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>

          <input
            type="text"
            value={inputVal}
            placeholder={hint}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
            style={{
              flex: 1,
              fontFamily: 'Consolas, monospace',
              fontSize: 12,
              padding: '4px 8px',
              border: '1px solid var(--panel-border)',
              borderRadius: 4,
              background: 'var(--bg-0)',
              color: 'var(--text-900)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
