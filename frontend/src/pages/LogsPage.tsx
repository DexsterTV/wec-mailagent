import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logsApi } from '../lib/api/logs'
import type { LogEntry } from '../types'

const ACTION_META: Record<string, { label: string; color: string }> = {
  LOGIN:              { label: 'Logowanie',         color: '#4f46e5' },
  LOGIN_FAIL:         { label: 'Błąd logowania',    color: '#ef4444' },
  LOGOUT:             { label: 'Wylogowanie',        color: '#64748b' },
  EXPORT_COPY:        { label: 'Kopiowanie HTML',    color: '#0891b2' },
  EXPORT_DOWNLOAD:    { label: 'Pobieranie HTML',    color: '#0891b2' },
  TEMPLATE_SAVE:      { label: 'Zapis szablonu',     color: '#f59e0b' },
  TEMPLATE_DELETE:    { label: 'Usunięcie szablonu', color: '#ef4444' },
  TEMPLATE_SELECT:    { label: 'Wybór szablonu',     color: '#64748b' },
  CONTACT_ADD:        { label: 'Dodanie kontaktu',   color: '#10b981' },
  CONTACT_EDIT:       { label: 'Edycja kontaktu',    color: '#f59e0b' },
  CONTACT_DELETE:     { label: 'Usunięcie kontaktu', color: '#ef4444' },
  USER_ADD:           { label: 'Dodanie użytk.',     color: '#10b981' },
  USER_EDIT:          { label: 'Edycja użytk.',      color: '#f59e0b' },
  USER_DELETE:        { label: 'Usunięcie użytk.',   color: '#ef4444' },
  PROWLY_FETCH:       { label: 'Pobr. prasówek',     color: '#8b5cf6' },
  PROWLY_FETCH_ERROR: { label: 'Błąd prasówek',      color: '#ef4444' },
  PRESS_SELECT:       { label: 'Wybór prasówek',     color: '#8b5cf6' },
  SETTINGS_UPDATE:    { label: 'Ustawienia',         color: '#f59e0b' },
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action]
  const color = meta?.color ?? '#64748b'
  const label = meta?.label ?? action
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      background: color + '18',
      color,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  )
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return ts
  }
}

export default function LogsPage() {
  const qc = useQueryClient()

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => logsApi.getAll(),
  })

  const clearMutation = useMutation({
    mutationFn: () => logsApi.clear(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logs'] }),
  })

  async function handleClear() {
    if (!confirm('Czy na pewno wyczyścić wszystkie logi?')) return
    await clearMutation.mutateAsync()
  }

  async function handleExport() {
    const blob = await logsApi.getCsvBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wec-logi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sorted = [...logs].reverse()

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Logi systemu</span>
          {logs.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 99, padding: '2px 8px',
            }}>
              {logs.length} wpisów
            </span>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={logs.length === 0}>
            Eksportuj CSV
          </button>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
            onClick={handleClear}
            disabled={clearMutation.isPending || logs.length === 0}
          >
            Wyczyść logi
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 24, gap: 0 }}>
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Sticky table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 110px 160px 1fr',
            padding: '0 16px',
            background: 'var(--workspace-bg)',
            borderBottom: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            flexShrink: 0,
          }}>
            {['Data i czas', 'Użytkownik', 'Akcja', 'Szczegóły'].map((h) => (
              <div key={h} style={{
                padding: '10px 8px',
                fontSize: 11, fontWeight: 600,
                color: 'var(--text-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Scrollable rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                Ładowanie…
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>
                Brak wpisów w logach.
              </div>
            ) : (
              sorted.map((log: LogEntry, idx) => (
                <div
                  key={log.id ?? idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 110px 160px 1fr',
                    padding: '0 16px',
                    borderBottom: '1px solid var(--panel-border)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.012)')}
                >
                  <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-500)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(log.timestamp)}
                  </div>
                  <div style={{ padding: '10px 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.user}
                  </div>
                  <div style={{ padding: '10px 8px', display: 'flex', alignItems: 'center' }}>
                    <ActionBadge action={log.action} />
                  </div>
                  <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
