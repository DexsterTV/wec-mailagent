import { useState, useMemo } from 'react'
import { formatPln, formatPlnWithType } from '../../lib/utils/money'
import { logsApi } from '../../lib/api/logs'
import type {
  Brand, Outlet, CollaborationType, Collaboration,
  CollaborationStatus, PriceType,
} from '../../types'

interface Props {
  brands: Brand[]
  outlets: Outlet[]
  types: CollaborationType[]
  collaborations: Collaboration[]
}

interface SummaryFilters {
  brandId: string
  outletId: string
  typeId: string
  status: '' | CollaborationStatus
  priceType: '' | PriceType
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: SummaryFilters = {
  brandId: '', outletId: '', typeId: '', status: '', priceType: '', dateFrom: '', dateTo: '',
}

interface Bucket {
  count: number
  sumNetto: number
  sumBrutto: number
}

function emptyBucket(): Bucket { return { count: 0, sumNetto: 0, sumBrutto: 0 } }
function addRow(b: Bucket, c: Collaboration) {
  b.count += 1
  if (c.priceType === 'NETTO') b.sumNetto += c.priceGrosze
  else b.sumBrutto += c.priceGrosze
}

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  PLANOWANA: 'Planowana',
  ZREALIZOWANA: 'Zrealizowana',
  ANULOWANA: 'Anulowana',
}

export default function SummaryTab({ brands, outlets, types, collaborations }: Props) {
  const [filters, setFilters] = useState<SummaryFilters>(EMPTY_FILTERS)

  const brandMap  = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands])
  const outletMap = useMemo(() => new Map(outlets.map((o) => [o.id, o.name])), [outlets])
  const typeMap   = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types])

  const filtered = useMemo(() => {
    return collaborations.filter((c) => {
      if (filters.brandId && c.brandId !== filters.brandId) return false
      if (filters.outletId && c.outletId !== filters.outletId) return false
      if (filters.typeId && c.collaborationTypeId !== filters.typeId) return false
      if (filters.status && c.status !== filters.status) return false
      if (filters.priceType && c.priceType !== filters.priceType) return false
      const ref = c.completedDate ?? c.plannedDate
      if (filters.dateFrom && (!ref || ref < filters.dateFrom)) return false
      if (filters.dateTo && (!ref || ref > filters.dateTo)) return false
      return true
    })
  }, [collaborations, filters])

  const summary = useMemo(() => {
    const total = emptyBucket()
    const byBrand: Record<string, Bucket> = {}
    const byOutlet: Record<string, Bucket> = {}
    const byStatus: Record<string, Bucket> = {}
    for (const c of filtered) {
      addRow(total, c)
      addRow((byBrand[c.brandId] ??= emptyBucket()), c)
      addRow((byOutlet[c.outletId] ??= emptyBucket()), c)
      addRow((byStatus[c.status] ??= emptyBucket()), c)
    }
    return { total, byBrand, byOutlet, byStatus }
  }, [filtered])

  function handleExportCsv() {
    const headers = ['Marka', 'Redakcja', 'Rodzaj', 'Cena (zł)', 'Typ ceny', 'Status', 'Termin', 'Data realizacji', 'Link', 'Notatka']
    const rows = filtered.map((c) => [
      brandMap.get(c.brandId) ?? '',
      outletMap.get(c.outletId) ?? '',
      typeMap.get(c.collaborationTypeId) ?? '',
      (c.priceGrosze / 100).toFixed(2).replace('.', ','),
      c.priceType,
      STATUS_LABELS[c.status],
      c.plannedDate ?? '',
      c.completedDate ?? '',
      c.link ?? '',
      (c.note ?? '').replace(/\n/g, ' '),
    ])
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const csv = '﻿'
      + headers.map(esc).join(';') + '\n'
      + rows.map((r) => r.map(esc).join(';')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `wspolprace_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    logsApi.add('WSP_CSV_EXPORT', `Eksport CSV ${filtered.length} współprac`)
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: '0.82rem', border: '1px solid var(--panel-border)',
    borderRadius: 4, background: 'var(--bg-0)',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Podsumowanie</h2>
        <button className="btn btn-primary btn-sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
          📥 Eksportuj CSV
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 20,
      }}>
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
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as SummaryFilters['status'] })} style={inputStyle}>
          <option value="">Każdy status</option>
          <option value="PLANOWANA">Planowana</option>
          <option value="ZREALIZOWANA">Zrealizowana</option>
          <option value="ANULOWANA">Anulowana</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} style={inputStyle} />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} style={inputStyle} />
      </div>

      {/* TOP CARDS */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24,
      }}>
        <KpiCard label="Liczba współprac" value={String(summary.total.count)} accent="#6366f1" />
        <KpiCard label="Suma netto" value={formatPln(summary.total.sumNetto)} accent="#10b981" />
        <KpiCard label="Suma brutto" value={formatPln(summary.total.sumBrutto)} accent="#f59e0b" />
      </div>

      {/* BREAKDOWNS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <BreakdownCard title="Według statusu" items={Object.entries(summary.byStatus).map(([k, v]) => ({
          label: STATUS_LABELS[k as CollaborationStatus] ?? k, bucket: v,
        }))} />
        <BreakdownCard title="Według marki" items={Object.entries(summary.byBrand).map(([k, v]) => ({
          label: brandMap.get(k) ?? k, bucket: v,
        }))} />
        <BreakdownCard title="Według redakcji" items={Object.entries(summary.byOutlet).map(([k, v]) => ({
          label: outletMap.get(k) ?? k, bucket: v,
        }))} />
      </div>
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-900)' }}>{value}</div>
    </div>
  )
}

function BreakdownCard({ title, items }: { title: string; items: { label: string; bucket: Bucket }[] }) {
  const sorted = items.sort((a, b) => (b.bucket.sumNetto + b.bucket.sumBrutto) - (a.bucket.sumNetto + a.bucket.sumBrutto))
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', margin: '0 0 12px' }}>
        {title}
      </h3>
      {sorted.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Brak danych.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(({ label, bucket }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2,
              paddingBottom: 8, borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ color: 'var(--text-muted)' }}>×{bucket.count}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Consolas, monospace' }}>
                {bucket.sumNetto > 0 && <span>{formatPlnWithType(bucket.sumNetto, 'NETTO')}</span>}
                {bucket.sumBrutto > 0 && <span>{formatPlnWithType(bucket.sumBrutto, 'BRUTTO')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
