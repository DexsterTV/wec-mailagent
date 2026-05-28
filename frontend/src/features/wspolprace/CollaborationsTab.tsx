import { useState, useMemo } from 'react'
import { wspolpraceApi } from '../../lib/api/wspolprace'
import { formatPlnWithType, parsePlnToGrosze, groszeToInputString } from '../../lib/utils/money'
import type {
  Brand,
  Outlet,
  CollaborationType,
  PriceListEntry,
  Collaboration,
  CollaborationStatus,
  PriceType,
} from '../../types'

interface Props {
  brands: Brand[]
  outlets: Outlet[]
  types: CollaborationType[]
  priceList: PriceListEntry[]
  collaborations: Collaboration[]
  onCreateOutlet: (name: string) => Promise<Outlet>
  onSaved: () => void | Promise<void>
}

interface Filters {
  brandId: string
  outletId: string
  typeId: string
  status: '' | CollaborationStatus
  priceType: '' | PriceType
  dateFrom: string
  dateTo: string
  search: string
}

const EMPTY_FILTERS: Filters = {
  brandId: '', outletId: '', typeId: '', status: '', priceType: '',
  dateFrom: '', dateTo: '', search: '',
}

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  PLANOWANA: 'Planowana',
  ZREALIZOWANA: 'Zrealizowana',
  ANULOWANA: 'Anulowana',
}

const STATUS_COLORS: Record<CollaborationStatus, string> = {
  PLANOWANA: '#f59e0b',
  ZREALIZOWANA: '#10b981',
  ANULOWANA: '#9ca3af',
}

export default function CollaborationsTab({
  brands, outlets, types, priceList, collaborations,
  onCreateOutlet, onSaved,
}: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Collaboration | null>(null)

  const activeBrands  = useMemo(() => brands.filter((b) => b.active), [brands])
  const activeOutlets = useMemo(() => outlets.filter((o) => o.active), [outlets])
  const activeTypes   = useMemo(() => types.filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder), [types])

  const brandMap  = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands])
  const outletMap = useMemo(() => new Map(outlets.map((o) => [o.id, o.name])), [outlets])
  const typeMap   = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types])

  const filtered = useMemo(() => {
    return collaborations
      .filter((c) => {
        if (filters.brandId && c.brandId !== filters.brandId) return false
        if (filters.outletId && c.outletId !== filters.outletId) return false
        if (filters.typeId && c.collaborationTypeId !== filters.typeId) return false
        if (filters.status && c.status !== filters.status) return false
        if (filters.priceType && c.priceType !== filters.priceType) return false
        if (filters.dateFrom) {
          const ref = c.completedDate ?? c.plannedDate
          if (!ref || ref < filters.dateFrom) return false
        }
        if (filters.dateTo) {
          const ref = c.completedDate ?? c.plannedDate
          if (!ref || ref > filters.dateTo) return false
        }
        if (filters.search) {
          const q = filters.search.toLowerCase()
          const brand = brandMap.get(c.brandId)?.toLowerCase() ?? ''
          const outlet = outletMap.get(c.outletId)?.toLowerCase() ?? ''
          if (!brand.includes(q) && !outlet.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [collaborations, filters, brandMap, outletMap])

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(c: Collaboration) {
    setEditing(c)
    setShowForm(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Współprace
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
            ({filtered.length} z {collaborations.length})
          </span>
        </h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nowa współpraca</button>
      </div>

      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        brands={brands}
        outlets={outlets}
        types={types}
      />

      <CollaborationTable
        rows={filtered}
        brandMap={brandMap}
        outletMap={outletMap}
        typeMap={typeMap}
        onEdit={openEdit}
      />

      {showForm && (
        <CollaborationForm
          editing={editing}
          brands={activeBrands}
          outlets={activeOutlets}
          types={activeTypes}
          priceList={priceList}
          onCreateOutlet={onCreateOutlet}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await onSaved() }}
        />
      )}
    </div>
  )
}

// ─── Filters ───────────────────────────────────────────────────────────────────
function FiltersBar({ filters, setFilters, brands, outlets, types }: {
  filters: Filters
  setFilters: (f: Filters) => void
  brands: Brand[]
  outlets: Outlet[]
  types: CollaborationType[]
}) {
  const inputStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.82rem', border: '1px solid var(--panel-border)',
    borderRadius: 4, background: 'var(--bg-0)', color: 'var(--text-900)',
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 8, marginBottom: 16,
    }}>
      <input
        type="text" placeholder="Szukaj marka/redakcja…"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        style={inputStyle}
      />
      <select value={filters.brandId} onChange={(e) => setFilters({ ...filters, brandId: e.target.value })} style={inputStyle}>
        <option value="">Wszystkie marki</option>
        {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select value={filters.outletId} onChange={(e) => setFilters({ ...filters, outletId: e.target.value })} style={inputStyle}>
        <option value="">Wszystkie redakcje</option>
        {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select value={filters.typeId} onChange={(e) => setFilters({ ...filters, typeId: e.target.value })} style={inputStyle}>
        <option value="">Wszystkie rodzaje</option>
        {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters['status'] })} style={inputStyle}>
        <option value="">Każdy status</option>
        <option value="PLANOWANA">Planowana</option>
        <option value="ZREALIZOWANA">Zrealizowana</option>
        <option value="ANULOWANA">Anulowana</option>
      </select>
      <select value={filters.priceType} onChange={(e) => setFilters({ ...filters, priceType: e.target.value as Filters['priceType'] })} style={inputStyle}>
        <option value="">Każdy typ ceny</option>
        <option value="NETTO">Netto</option>
        <option value="BRUTTO">Brutto</option>
      </select>
      <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} style={inputStyle} />
      <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} style={inputStyle} />
    </div>
  )
}

// ─── Table ─────────────────────────────────────────────────────────────────────
function CollaborationTable({ rows, brandMap, outletMap, typeMap, onEdit }: {
  rows: Collaboration[]
  brandMap: Map<string, string>
  outletMap: Map<string, string>
  typeMap: Map<string, string>
  onEdit: (c: Collaboration) => void
}) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', borderRadius: 8,
        border: '1px dashed var(--panel-border)', color: 'var(--text-muted)', fontSize: '0.9rem',
      }}>
        Brak współprac do wyświetlenia.
      </div>
    )
  }

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--panel-border)',
  }
  const td: React.CSSProperties = { padding: '10px', fontSize: '0.85rem', borderBottom: '1px solid var(--panel-border)' }

  return (
    <div style={{ border: '1px solid var(--panel-border)', borderRadius: 8, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Marka</th>
            <th style={th}>Redakcja</th>
            <th style={th}>Rodzaj</th>
            <th style={th}>Cena</th>
            <th style={th}>Status</th>
            <th style={th}>Termin</th>
            <th style={th}>Realizacja</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} style={{ background: 'var(--panel-bg)' }}>
              <td style={td}>{brandMap.get(c.brandId) ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}</td>
              <td style={td}>{outletMap.get(c.outletId) ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}</td>
              <td style={td}>{typeMap.get(c.collaborationTypeId) ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}</td>
              <td style={{ ...td, fontFamily: 'Consolas, monospace' }}>{formatPlnWithType(c.priceGrosze, c.priceType)}</td>
              <td style={td}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status],
                }}>
                  {STATUS_LABELS[c.status]}
                </span>
              </td>
              <td style={{ ...td, color: c.plannedDate ? 'var(--text-700)' : 'var(--text-muted)' }}>
                {c.plannedDate ?? '—'}
              </td>
              <td style={{ ...td, color: c.completedDate ? 'var(--text-700)' : 'var(--text-muted)' }}>
                {c.completedDate ?? '—'}
              </td>
              <td style={td}>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(c)}>Edytuj</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Form (modal) ──────────────────────────────────────────────────────────────
function CollaborationForm({
  editing, brands, outlets, types, priceList, onCreateOutlet, onClose, onSaved,
}: {
  editing: Collaboration | null
  brands: Brand[]
  outlets: Outlet[]
  types: CollaborationType[]
  priceList: PriceListEntry[]
  onCreateOutlet: (name: string) => Promise<Outlet>
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [brandId, setBrandId] = useState(editing?.brandId ?? '')
  const [outletId, setOutletId] = useState(editing?.outletId ?? '')
  const [typeId, setTypeId] = useState(editing?.collaborationTypeId ?? '')
  const [priceText, setPriceText] = useState(editing ? groszeToInputString(editing.priceGrosze) : '')
  const [priceType, setPriceType] = useState<PriceType>(editing?.priceType ?? 'NETTO')
  const [status, setStatus] = useState<CollaborationStatus>(editing?.status ?? 'PLANOWANA')
  const [plannedDate, setPlannedDate] = useState(editing?.plannedDate ?? '')
  const [completedDate, setCompletedDate] = useState(editing?.completedDate ?? '')
  const [link, setLink] = useState(editing?.link ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [showNewOutlet, setShowNewOutlet] = useState(false)
  const [newOutletName, setNewOutletName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suggest price when outlet+type chosen
  function applyPriceSuggestion(oId: string, tId: string) {
    if (!oId || !tId) return
    const hit = priceList.find((p) => p.outletId === oId && p.collaborationTypeId === tId)
    if (hit) {
      setPriceText(groszeToInputString(hit.priceGrosze))
      setPriceType(hit.priceType)
    }
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      let priceGrosze: number
      try {
        priceGrosze = parsePlnToGrosze(priceText)
      } catch {
        throw new Error('Nieprawidłowa cena')
      }
      const payload = {
        brandId, outletId, collaborationTypeId: typeId,
        priceGrosze, priceType, status,
        plannedDate: plannedDate || null,
        completedDate: status === 'ZREALIZOWANA' ? (completedDate || null) : null,
        link: link.trim() || null,
        note: note.trim() || null,
      }
      if (editing) {
        await wspolpraceApi.updateCollaboration(editing.id, payload)
      } else {
        await wspolpraceApi.createCollaboration(payload)
      }
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateOutlet() {
    const n = newOutletName.trim()
    if (!n) return
    try {
      const o = await onCreateOutlet(n)
      setOutletId(o.id)
      setNewOutletName('')
      setShowNewOutlet(false)
      applyPriceSuggestion(o.id, typeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd dodawania redakcji')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        width: 'min(560px, 92vw)', maxHeight: '90vh', overflow: 'auto',
        background: 'var(--panel-bg)', borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ fontSize: 16, margin: '0 0 16px' }}>
          {editing ? 'Edycja współpracy' : 'Nowa współpraca'}
        </h3>

        {error && (
          <div style={{ padding: 10, marginBottom: 12, borderRadius: 6,
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormRow label="Marka">
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">— wybierz —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormRow>

          <FormRow label="Redakcja">
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={outletId}
                onChange={(e) => { setOutletId(e.target.value); applyPriceSuggestion(e.target.value, typeId) }}
                style={{ flex: 1 }}
              >
                <option value="">— wybierz —</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewOutlet(!showNewOutlet)}>+ nowa</button>
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
          </FormRow>

          <FormRow label="Rodzaj">
            <select
              value={typeId}
              onChange={(e) => { setTypeId(e.target.value); applyPriceSuggestion(outletId, e.target.value) }}
            >
              <option value="">— wybierz —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>

          <FormRow label="Cena (PLN)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" value={priceText} placeholder="np. 1234,56"
                onChange={(e) => setPriceText(e.target.value)}
                style={{ flex: 1, fontFamily: 'Consolas, monospace' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="radio" name="pt" checked={priceType === 'NETTO'} onChange={() => setPriceType('NETTO')} />
                netto
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="radio" name="pt" checked={priceType === 'BRUTTO'} onChange={() => setPriceType('BRUTTO')} />
                brutto
              </label>
            </div>
          </FormRow>

          <FormRow label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as CollaborationStatus)}>
              <option value="PLANOWANA">Planowana</option>
              <option value="ZREALIZOWANA">Zrealizowana</option>
              <option value="ANULOWANA">Anulowana</option>
            </select>
          </FormRow>

          <FormRow label="Termin (planowana data)">
            <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
          </FormRow>

          <FormRow label="Data realizacji">
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              disabled={status !== 'ZREALIZOWANA'}
              style={{ opacity: status === 'ZREALIZOWANA' ? 1 : 0.5 }}
            />
            {status === 'ZREALIZOWANA' && !completedDate && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                Wymagane dla statusu Zrealizowana
              </div>
            )}
          </FormRow>

          <FormRow label="Link (publikacja / faktura)">
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          </FormRow>

          <FormRow label="Notatka">
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem',
                padding: '6px 8px', borderRadius: 4, border: '1px solid var(--panel-border)' }}
            />
          </FormRow>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>Anuluj</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Zapisywanie…' : (editing ? 'Zapisz zmiany' : 'Dodaj współpracę')}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-700)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
