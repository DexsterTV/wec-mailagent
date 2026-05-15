import { useState, useEffect, useMemo } from 'react'
import { extractColorsPerOccurrence, PROP_PL } from '../../lib/utils/colorExtractor'
import { replaceColorAtPosition } from '../../lib/utils/colorReplacer'
import type { DetectedColor } from '../../types'

interface ColorEditorProps {
  html: string
  colorMappings: DetectedColor[]
  onChange: (newHtml: string, newMappings: DetectedColor[]) => void
}

export default function ColorEditor({ html, colorMappings, onChange }: ColorEditorProps) {
  // Re-extract from current HTML whenever it changes so positions stay accurate.
  // colorMappings prop is only used as a "has been scanned" indicator.
  const [scanned, setScanned] = useState(colorMappings.length > 0)
  const colors = useMemo(() => (scanned ? extractColorsPerOccurrence(html) : []), [html, scanned])

  useEffect(() => {
    setScanned(colorMappings.length > 0)
  }, [colorMappings])

  function handleScan() {
    const detected = extractColorsPerOccurrence(html)
    if (detected.length === 0) {
      alert('Nie znaleziono żadnych kolorów w kodzie HTML szablonu.')
      return
    }
    setScanned(true)
    onChange(html, detected)
  }

  function handleColorChange(c: DetectedColor, newHex: string) {
    if (c.position === undefined || c.rawForm === undefined) return
    const newHtml = replaceColorAtPosition(html, c.position, c.rawForm, newHex)
    if (newHtml === html) return // position no longer valid
    const fresh = extractColorsPerOccurrence(newHtml)
    onChange(newHtml, fresh)
  }

  function handleHexInput(c: DetectedColor, value: string) {
    const normalized = value.startsWith('#') ? value : `#${value}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      handleColorChange(c, normalized.toLowerCase())
    }
  }

  if (!scanned) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.9rem' }}>
          Kliknij „Skanuj kolory", aby wykryć kolory użyte w szablonie.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={!html.trim()}>
          Skanuj kolory
        </button>
      </div>
    )
  }

  // Number occurrences within (hex|primaryProperty) groups so duplicates are distinguishable.
  const groupCounters = new Map<string, { current: number; total: number }>()
  colors.forEach((c) => {
    const k = `${c.hex}|${c.primaryProperty ?? ''}`
    const entry = groupCounters.get(k) ?? { current: 0, total: 0 }
    entry.total++
    groupCounters.set(k, entry)
  })

  // Group rows by CSS property (e.g. all "background-color" together, all "border-color" together)
  // while keeping each occurrence as its own row.
  const PROP_ORDER = [
    'background-color', 'background',
    'color',
    'border-color', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'outline', 'box-shadow', 'fill', 'stroke', 'text-decoration-color', 'caret-color',
  ]
  const grouped = new Map<string, DetectedColor[]>()
  for (const c of colors) {
    const key = c.primaryProperty ?? ''
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(c)
  }
  const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => {
    const ia = PROP_ORDER.indexOf(a)
    const ib = PROP_ORDER.indexOf(b)
    const aRank = ia === -1 ? 999 : ia
    const bRank = ib === -1 ? 999 : ib
    return aRank - bRank || a.localeCompare(b)
  })

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {colors.length} {colors.length === 1 ? 'wystąpienie' : 'wystąpień'}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleScan}>
          Skanuj ponownie
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedGroups.map(([prop, groupColors]) => {
          const groupLabel = prop ? (PROP_PL[prop] ?? prop) : 'inne'
          return (
            <div key={prop || 'other'}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                marginBottom: 6,
                paddingBottom: 4,
                borderBottom: '1px solid var(--panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>{groupLabel}</span>
                <span style={{ fontWeight: 500 }}>{groupColors.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {groupColors.map((color) => {
                  const k = `${color.hex}|${color.primaryProperty ?? ''}`
                  const ctr = groupCounters.get(k)!
                  ctr.current++
                  const rank = ctr.current
                  return (
                    <ColorRow
                      key={color.position}
                      color={color}
                      rank={rank}
                      total={ctr.total}
                      onColorChange={(newHex) => handleColorChange(color, newHex)}
                      onHexInput={(val) => handleHexInput(color, val)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ColorRowProps {
  color: DetectedColor
  rank: number
  total: number
  onColorChange: (hex: string) => void
  onHexInput: (value: string) => void
}

function ColorRow({ color, rank, total, onColorChange, onHexInput }: ColorRowProps) {
  const [hexInput, setHexInput] = useState(color.hex)

  useEffect(() => {
    setHexInput(color.hex)
  }, [color.hex])

  const roleLabel = color.label.split(' — ')[0]

  return (
    <div style={{
      borderRadius: 6,
      background: 'var(--bg-100)',
      border: '1px solid var(--panel-border)',
      overflow: 'hidden',
    }}>
      {/* Label row */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-400)',
        padding: '4px 8px',
        borderBottom: '1px solid var(--panel-border)',
        background: 'var(--panel-bg)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span>{roleLabel}</span>
        {total > 1 && (
          <span style={{ fontWeight: 600, color: 'var(--text-500)' }}>
            #{rank} z {total}
          </span>
        )}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px' }}>
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 5,
            background: color.hex,
            border: '2px solid var(--panel-border)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
          }} />
          <input
            type="color"
            value={color.hex}
            onChange={(e) => onColorChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            tabIndex={-1}
          />
        </label>

        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            setHexInput(e.target.value)
            onHexInput(e.target.value)
          }}
          onBlur={() => setHexInput(color.hex)}
          style={{
            flex: 1,
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            padding: '4px 6px',
            border: '1px solid var(--panel-border)',
            borderRadius: 4,
            background: 'var(--bg-0)',
            color: 'var(--text-900)',
          }}
          maxLength={9}
        />
      </div>
    </div>
  )
}
