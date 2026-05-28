import { useState, useMemo } from 'react'
import { wspolpraceApi } from '../../lib/api/wspolprace'
import type { Outlet, Collaboration, PriceListEntry } from '../../types'

interface Props {
  outlets: Outlet[]
  collaborations: Collaboration[]
  priceList: PriceListEntry[]
  onSaved: () => void | Promise<void>
}

export default function OutletsTab({ outlets, collaborations, priceList, onSaved }: Props) {
  const [filter, setFilter] = useState('')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const map = new Map<string, { collabs: number; prices: number }>()
    for (const o of outlets) map.set(o.id, { collabs: 0, prices: 0 })
    for (const c of collaborations) {
      const e = map.get(c.outletId)
      if (e) e.collabs++
    }
    for (const p of priceList) {
      const e = map.get(p.outletId)
      if (e) e.prices++
    }
    return map
  }, [outlets, collaborations, priceList])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return outlets
      .filter((o) => !q || o.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [outlets, filter])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      await wspolpraceApi.createOutlet(name)
      setNewName('')
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd dodawania redakcji')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(id: string) {
    const name = editingName.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      await wspolpraceApi.updateOutlet(id, { name })
      setEditingId(null)
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd edycji')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive(o: Outlet) {
    setBusy(true)
    setError(null)
    try {
      await wspolpraceApi.updateOutlet(o.id, { active: !o.active })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zmiany statusu')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Redakcje</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        Słownik redakcji używanych w cenniku i współpracach. Każdy może dodać.
      </p>

      {error && (
        <div style={{ padding: 10, marginBottom: 12, borderRadius: 6,
          background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nazwa nowej redakcji"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--panel-border)' }}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={busy || !newName.trim()}>
          + Dodaj redakcję
        </button>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtruj po nazwie…"
        style={{ width: '100%', padding: '6px 10px', marginBottom: 12,
          borderRadius: 6, border: '1px solid var(--panel-border)', fontSize: '0.85rem' }}
      />

      <div style={{ border: '1px solid var(--panel-border)', borderRadius: 8, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Brak redakcji {filter ? 'pasujących do filtra' : '— dodaj pierwszą'}.
          </div>
        ) : (
          filtered.map((o) => {
            const c = counts.get(o.id) ?? { collabs: 0, prices: 0 }
            const isEditing = editingId === o.id
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderBottom: '1px solid var(--panel-border)',
                opacity: o.active ? 1 : 0.5,
              }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(o.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--panel-border)' }}
                  />
                ) : (
                  <div style={{ flex: 1, fontWeight: 500, color: 'var(--text-900)' }}>
                    {o.name}
                    {!o.active && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>(nieaktywna)</span>}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {c.collabs} współprac · {c.prices} cen
                </div>
                {isEditing ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(o.id)} disabled={busy}>Zapisz</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Anuluj</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(o.id); setEditingName(o.name) }}>Edytuj</button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleActive(o)}
                      disabled={busy}
                      title={o.active ? 'Dezaktywuj' : 'Aktywuj'}
                    >
                      {o.active ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
