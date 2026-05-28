import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { wspolpraceApi } from '../lib/api/wspolprace'
import type {
  Brand,
  CollaborationType,
  Outlet,
  PriceListEntry,
  Collaboration,
} from '../types'
import CollaborationsTab from '../features/wspolprace/CollaborationsTab'
import PriceListTab from '../features/wspolprace/PriceListTab'
import OutletsTab from '../features/wspolprace/OutletsTab'
import SummaryTab from '../features/wspolprace/SummaryTab'
import WspolpraceSettingsTab from '../features/wspolprace/WspolpraceSettingsTab'

type Tab = 'collaborations' | 'price-list' | 'outlets' | 'summary' | 'settings'

const TAB_LABELS: Record<Tab, string> = {
  collaborations: 'Współprace',
  'price-list':   'Cennik',
  outlets:        'Redakcje',
  summary:        'Podsumowanie',
  settings:       'Ustawienia',
}

export default function WspolpracePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<Tab>('collaborations')

  const [brands, setBrands] = useState<Brand[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [types, setTypes] = useState<CollaborationType[]>([])
  const [priceList, setPriceList] = useState<PriceListEntry[]>([])
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [b, o, t, p, c] = await Promise.all([
        wspolpraceApi.getBrands(),
        wspolpraceApi.getOutlets(),
        wspolpraceApi.getTypes(),
        wspolpraceApi.getPriceList(),
        wspolpraceApi.getCollaborations(),
      ])
      setBrands(b)
      setOutlets(o)
      setTypes(t)
      setPriceList(p)
      setCollaborations(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const visibleTabs: Tab[] = isAdmin
    ? ['collaborations', 'price-list', 'outlets', 'summary', 'settings']
    : ['collaborations', 'price-list', 'outlets', 'summary']

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Płatne współprace</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--panel-border)',
          padding: '0 24px',
          background: 'var(--bg-0)',
          flexShrink: 0,
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 24 }}>
        {error && (
          <div style={{
            padding: 12, marginBottom: 16, borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ładowanie…</div>
        )}

        {!loading && activeTab === 'collaborations' && (
          <CollaborationsTab
            brands={brands}
            outlets={outlets}
            types={types}
            priceList={priceList}
            collaborations={collaborations}
            onCreateOutlet={async (name) => {
              const o = await wspolpraceApi.createOutlet(name)
              setOutlets((prev) => [...prev, o])
              return o
            }}
            onSaved={loadAll}
          />
        )}

        {!loading && activeTab === 'price-list' && (
          <PriceListTab
            outlets={outlets}
            types={types}
            priceList={priceList}
            onCreateOutlet={async (name) => {
              const o = await wspolpraceApi.createOutlet(name)
              setOutlets((prev) => [...prev, o])
              return o
            }}
            onSaved={loadAll}
          />
        )}

        {!loading && activeTab === 'outlets' && (
          <OutletsTab
            outlets={outlets}
            collaborations={collaborations}
            priceList={priceList}
            onSaved={loadAll}
          />
        )}

        {!loading && activeTab === 'summary' && (
          <SummaryTab
            brands={brands}
            outlets={outlets}
            types={types}
            collaborations={collaborations}
          />
        )}

        {!loading && activeTab === 'settings' && isAdmin && (
          <WspolpraceSettingsTab
            brands={brands}
            types={types}
            onSaved={loadAll}
          />
        )}
      </div>
    </div>
  )
}
