import { useState } from 'react'
import { wspolpraceApi } from '../../lib/api/wspolprace'
import type { Brand, CollaborationType } from '../../types'

interface Props {
  brands: Brand[]
  types: CollaborationType[]
  onSaved: () => void | Promise<void>
}

export default function WspolpraceSettingsTab({ brands, types, onSaved }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
      <BrandsSection brands={brands} onSaved={onSaved} />
      <TypesSection types={types} onSaved={onSaved} />
    </div>
  )
}

function BrandsSection({ brands, onSaved }: { brands: Brand[]; onSaved: () => void | Promise<void> }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setBusy(true); setError(null)
    try {
      await wspolpraceApi.createBrand(newName.trim())
      setNewName('')
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setBusy(false) }
  }

  async function handleSaveEdit(id: string) {
    if (!editingName.trim()) return
    setBusy(true); setError(null)
    try {
      await wspolpraceApi.updateBrand(id, { name: editingName.trim() })
      setEditingId(null)
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setBusy(false) }
  }

  async function handleToggleActive(b: Brand) {
    setBusy(true); setError(null)
    try {
      await wspolpraceApi.updateBrand(b.id, { active: !b.active })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setBusy(false) }
  }

  const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Marki
      </h3>

      {error && (
        <div style={{ padding: 8, marginBottom: 10, borderRadius: 6,
          background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.78rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input type="text" value={newName} placeholder="Nazwa marki"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--panel-border)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy || !newName.trim()}>+ Dodaj</button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
          Brak marek — dodaj pierwszą.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((b) => {
            const isEditing = editingId === b.id
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 4,
                background: 'var(--workspace-bg)', opacity: b.active ? 1 : 0.5,
              }}>
                {isEditing ? (
                  <input type="text" value={editingName} autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(b.id); if (e.key === 'Escape') setEditingId(null) }}
                    style={{ flex: 1, padding: '4px 6px', fontSize: 13 }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 13 }}>
                    {b.name}
                    {!b.active && <em style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>(nieaktywna)</em>}
                  </span>
                )}
                {isEditing ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(b.id)} disabled={busy}>OK</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>×</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(b.id); setEditingName(b.name) }}>Edytuj</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(b)} disabled={busy}>
                      {b.active ? 'Deaktywuj' : 'Aktywuj'}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TypesSection({ types, onSaved }: { types: CollaborationType[]; onSaved: () => void | Promise<void> }) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setBusy(true); setError(null)
    try {
      await wspolpraceApi.createType({ name: newName.trim() })
      setNewName('')
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setBusy(false) }
  }

  async function handleToggleActive(t: CollaborationType) {
    setBusy(true); setError(null)
    try {
      await wspolpraceApi.updateType(t.id, { active: !t.active })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setBusy(false) }
  }

  const sorted = [...types].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Rodzaje współpracy
      </h3>

      {error && (
        <div style={{ padding: 8, marginBottom: 10, borderRadius: 6,
          background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.78rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input type="text" value={newName} placeholder="Nazwa rodzaju"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--panel-border)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy || !newName.trim()}>+ Dodaj</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((t) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 4,
            background: 'var(--workspace-bg)', opacity: t.active ? 1 : 0.5,
          }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              {t.name}
              {!t.active && <em style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>(nieaktywny)</em>}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(t)} disabled={busy}>
              {t.active ? 'Deaktywuj' : 'Aktywuj'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
