import { useState, useEffect } from 'react'
import { extractColors, PROP_PL } from '../../lib/utils/colorExtractor'
import { replaceColorInHtml } from '../../lib/utils/colorReplacer'
import type { DetectedColor } from '../../types'

interface ColorEditorProps {
  html: string
  colorMappings: DetectedColor[]
  onChange: (newHtml: string, newMappings: DetectedColor[]) => void
}

export default function ColorEditor({ html, colorMappings, onChange }: ColorEditorProps) {
  const [colors, setColors] = useState<DetectedColor[]>(colorMappings)
  const [scanned, setScanned] = useState(colorMappings.length > 0)

  useEffect(() => {
    setColors(colorMappings)
    setScanned(colorMappings.length > 0)
  }, [colorMappings])

  function handleScan() {
    const detected = extractColors(html)
    if (detected.length === 0) {
      alert('Nie znaleziono żadnych kolorów w kodzie HTML szablonu.')
      return
    }
    setColors(detected)
    setScanned(true)
    onChange(html, detected)
  }

  function handleColorChange(index: number, newHex: string) {
    const color = colors[index]
    const newHtml = replaceColorInHtml(html, color.rawForms, newHex)
    const updatedColors = colors.map((c, i) =>
      i === index ? { ...c, hex: newHex, rawForms: [newHex] } : c
    )
    setColors(updatedColors)
    onChange(newHtml, updatedColors)
  }

  function handleHexInput(index: number, value: string) {
    const normalized = value.startsWith('#') ? value : `#${value}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      handleColorChange(index, normalized.toLowerCase())
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

  const grouped = colors.reduce<Record<string, DetectedColor[]>>((acc, c) => {
    const key = c.label
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Znaleziono {colors.length} kolorów
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleScan}>
          Skanuj ponownie
        </button>
      </div>

      {Object.entries(grouped).map(([groupLabel, groupColors]) => (
        <div key={groupLabel} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid var(--panel-border)',
          }}>
            {groupLabel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupColors.map((color) => {
              const globalIndex = colors.indexOf(color)
              return (
                <ColorRow
                  key={color.hex + globalIndex}
                  color={color}
                  onColorChange={(newHex) => handleColorChange(globalIndex, newHex)}
                  onHexInput={(val) => handleHexInput(globalIndex, val)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

interface ColorRowProps {
  color: DetectedColor
  onColorChange: (hex: string) => void
  onHexInput: (value: string) => void
}

function ColorRow({ color, onColorChange, onHexInput }: ColorRowProps) {
  const [hexInput, setHexInput] = useState(color.hex)

  useEffect(() => {
    setHexInput(color.hex)
  }, [color.hex])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 8px',
      borderRadius: 6,
      background: 'var(--bg-100)',
      border: '1px solid var(--panel-border)',
    }}>
      {/* Color swatch + native picker */}
      <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 6,
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

      {/* Hex text input */}
      <input
        type="text"
        value={hexInput}
        onChange={(e) => {
          setHexInput(e.target.value)
          onHexInput(e.target.value)
        }}
        onBlur={() => setHexInput(color.hex)}
        style={{
          width: 80,
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

      {/* Properties — shown as Polish labels, deduplicated */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Array.from(new Set(color.properties.map((p) => PROP_PL[p] ?? p))).slice(0, 3).map((label) => (
          <span key={label} style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 10,
            background: 'var(--panel-border)',
            color: 'var(--text-500)',
          }}>
            {label}
          </span>
        ))}
      </div>

      {/* Usage count */}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
        ×{color.count}
      </span>
    </div>
  )
}
