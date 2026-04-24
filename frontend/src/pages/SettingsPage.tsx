import { useState, useEffect } from 'react'
import { settingsApi } from '../lib/api/settings'
import { logsApi } from '../lib/api/logs'

export default function SettingsPage() {
  const [rssUrl,    setRssUrl]    = useState('')
  const [inputVal,  setInputVal]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<{ text: string; ok: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    settingsApi.get()
      .then((s) => {
        const url = s.prowlyRssUrl ?? ''
        setRssUrl(url)
        setInputVal(url)
      })
      .catch(() => setMsg({ text: 'Nie udało się załadować ustawień.', ok: false }))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const saved = await settingsApi.save({ prowlyRssUrl: inputVal.trim() })
      setRssUrl(saved.prowlyRssUrl ?? '')
      logsApi.add('SETTINGS_UPDATE', `Zaktualizowano URL RSS Prowly: ${inputVal.trim()}`)
      setMsg({ text: 'Ustawienia zostały zapisane.', ok: true })
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Błąd zapisu.', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Ustawienia systemu</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 680 }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ładowanie…</div>
        ) : (
          <form onSubmit={handleSave}>
            {/* ── Prowly integration ─────────────────────────────────── */}
            <div style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              marginBottom: 24,
            }}>
              <h2 style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-900)',
                marginBottom: 4,
              }}>
                Integracja Prowly
              </h2>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}>
                Podaj adres RSS lub Atom newsroomu Prowly. Wszyscy użytkownicy będą
                pobierać prasówki z tego źródła. Adres można znaleźć w ustawieniach
                newsroomu Prowly (zakładka „RSS / Feed").
              </p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="prowly-rss">URL feedu RSS / Atom</label>
                <input
                  id="prowly-rss"
                  type="url"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="https://newsroom.prowly.com/…/feed lub .../rss"
                  spellCheck={false}
                />
                {rssUrl && (
                  <div className="field-hint">
                    Aktualnie skonfigurowany: <code style={{ wordBreak: 'break-all' }}>{rssUrl}</code>
                  </div>
                )}
              </div>

              {msg && (
                <div style={{
                  fontSize: '0.85rem',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 12,
                  background: msg.ok ? 'var(--success-light)' : 'var(--danger-light)',
                  color: msg.ok ? '#059669' : 'var(--danger)',
                  border: `1px solid ${msg.ok ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
                }}>
                  {msg.ok ? '✓ ' : '✕ '}{msg.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || inputVal.trim() === rssUrl}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
