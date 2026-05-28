import { useState, useMemo } from 'react'
import { wspolpraceApi } from '../../lib/api/wspolprace'
import { formatPlnWithType, parsePlnToGrosze, groszeToInputString } from '../../lib/utils/money'
import type { Outlet, CollaborationType, PriceListEntry, PriceType } from '../../types'

interface Props {
  outlets: Outlet[]
  types: CollaborationType[]
  priceList: PriceListEntry[]
  onCreateOutlet: (name: string) => Promise<Outlet>
  onSaved: () => void | Promise<void>
}

export default function PriceListTab({ outlets, types, priceList, onCreateOutlet, onSaved }: Props) {
  const [filterOutlet, setFilterOutlet] = useState('')
  const [filterType, setFilterType] = useState('')
  const [editing, setEditing] = useState<PriceListEntry | null>(null)
  const [showForm, setShowForm] = useState(false)

  const outletMap = useMemo(() => new Map(outlets.map((o) => [o.id, o.name])), [outlets])
  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types])

  const filtered = useMemo(() => {
    return priceList
      .filter((p) => (!filterOutlet || p.outletId === filterOutlet) && (!filterType || p.collaborationTypeId === filterType))
      .sort((a, b) => {
        const oa = outletMap.get(a.outletId) ?? ''
        const ob = outletMap.get(b.outletId) ?? ''
        return oa.localeCompare(ob, 'pl') || (typeMap.get(a.collaborationTypeId) ?? '').localeCompare(typeMap.get(b.collaborationTypeId) ?? '', 'pl')
      })
  }, [priceList, filterOutlet, filterType, outletMap, typeMap])

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--panel-border)',
  }
  const td: React.CSSProperties = { padding: '10px', fontSize: '0.85rem', borderBottom: '1px solid var(--panel-border)' }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć wpis cennika?')) return
    await wspolpraceApi.deletePriceEntry(id)
    await onSaved()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Cennik
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
            ({filtered.length} z {priceList.length})
          </span>
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Dodaj / zaktualizuj wycenę
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}
          style={{ padding: '6px 8px', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--panel-border)' }}>
          <option value="">Wszystkie redakcje</option>
          {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '6px 8px', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--panel-border)' }}>
          <option value="">Wszystkie rodzaje</option>
          {types.filter((t) => t.active).sort((a, b) => a.sortOrder - b.sortOrder).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', borderRadius: 8,
          border: '1px dashed var(--panel-border)', color: 'var(--text-muted)', fontSize: '0.9rem',
        }}>
          Brak wycen {filterOutlet || filterType ? 'dla wybranych filtrów' : '— dodaj pierwszą'}.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--panel-border)', borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Redakcja</th>
                <th style={th}>Rodzaj</th>
                <th style={th}>Cena</th>
                <th style={th}>Notatka</th>
                <th style={th}>Zaktualizowano</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ background: 'var(--panel-bg)' }}>
                  <td style={td}>{outletMap.get(p.outletId) ?? '—'}</td>
                  <td style={td}>{typeMap.get(p.collaborationTypeId) ?? '—'}</td>
                  <td style={{ ...td, fontFamily: 'Consolas, monospace' }}>{formatPlnWithType(p.priceGrosze, p.priceType)}</td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 12 }}>{p.note ?? '—'}</td>
                  <td style={{ ...td, fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(p.updatedAt).toLocaleDateString('pl-PL')}
                  </td>
                  <td style={td}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(p); setShowForm(true) }}>Edytuj</button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(p.id)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PriceEntryForm
          editing={editing}
          outlets={outlets.filter((o) => o.active)}
          types={types.filter((t) => t.active).sort((a, b) => a.sortOrder - b.sortOrder)}
          existing={priceList}
          onCreateOutlet={onCreateOutlet}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await onSaved() }}
        />
      )}
    </div>
  )
}

function PriceEntryForm({
  editing, outlets, types, existing, onCreateOutlet, onClose, onSaved,
}: {
  editing: PriceListEntry | null
  outlets: Outlet[]
  types: CollaborationType[]
  existing: PriceListEntry[]
  onCreateOutlet: (name: string) => Promise<Outlet>
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [outletId, setOutletId] = useState(editing?.outletId ?? '')
  const [typeId, setTypeId] = useState(editing?.collaborationTypeId ?? '')
  const [priceText, setPriceText] = useState(editing ? groszeToInputString(editing.priceGrosze) : '')
  const [priceType, setPriceType] = useState<PriceType>(editing?.priceType ?? 'NETTO')
  const [note, setNote] = useState(editing?.note ?? '')
  const [showNewOutlet, setShowNewOutlet] = useState(false)
  const [newOutletName, setNewOutletName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExistingPair = useMemo(() => {
    if (!outletId || !typeId) return false
    return existing.some((e) => e.outletId === outletId && e.collaborationTypeId === typeId && e.id !== editing?.id)
  }, [outletId, typeId, existing, editing])

  async function handleCreateOutlet() {
    const n = newOutletName.trim()
    if (!n) return
    try {
      const o = await onCreateOutlet(n)
      setOutletId(o.id)
      setNewOutletName('')
      setShowNewOutlet(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd dodawania redakcji')
    }
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      let priceGrosze: number
      try { priceGrosze = parsePlnToGrosze(priceText) }
      catch { throw new Error('Nieprawidłowa cena') }

      await wspolpraceApi.upsertPriceEntry({
        outletId, collaborationTypeId: typeId, priceGrosze, priceType,
        note: note.trim() || null,
      })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        width: 'min(520px, 92vw)', maxHeight: '90vh', overflow: 'auto',
        background: 'var(--panel-bg)', borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ fontSize: 16, margin: '0 0 16px' }}>
          {editing ? 'Edycja wyceny' : 'Wycena (dodaj lub zaktualizuj)'}
        </h3>

        {error && (
          <div style={{ padding: 10, marginBottom: 12, borderRadius: 6,
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        {isExistingPair && (
          <div style={{ padding: 10, marginBottom: 12, borderRadius: 6,
            background: 'rgba(245,158,11,0.08)', color: '#d97706', fontSize: '0.82rem' }}>
            ⚠ Para (redakcja, rodzaj) już ma wycenę — zostanie nadpisana.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Redakcja</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} style={{ flex: 1 }} disabled={!!editing}>
                <option value="">— wybierz —</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {!editing && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewOutlet(!showNewOutlet)}>+ nowa</button>
              )}
            </div>
            {showNewOutlet && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  type="text" value={newOutletName} placeholder="Nazwa nowej redakcji"
                  onChange={(e) => setNewOutletName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateOutlet() }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateOutlet}>Dodaj</button>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Rodzaj</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} disabled={!!editing}>
              <option value="">— wybierz —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Cena (PLN)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" value={priceText} placeholder="np. 1234,56"
                onChange={(e) => setPriceText(e.target.value)}
                style={{ flex: 1, fontFamily: 'Consolas, monospace' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="radio" name="ptpl" checked={priceType === 'NETTO'} onChange={() => setPriceType('NETTO')} />
                netto
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="radio" name="ptpl" checked={priceType === 'BRUTTO'} onChange={() => setPriceType('BRUTTO')} />
                brutto
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Notatka</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem', padding: '6px 8px',
                borderRadius: 4, border: '1px solid var(--panel-border)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>Anuluj</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  )
}
