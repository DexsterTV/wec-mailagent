import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchProwlyPosts, searchProwlyPosts } from '../../lib/api/prowly'
import { logsApi } from '../../lib/api/logs'
import type { ProwlyPost, PressMapEntry } from '../../types'

type Mode = 'recent' | 'search'

function useProwlyPosts() {
  const [posts, setPosts] = useState<ProwlyPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchProwlyPosts()
      setPosts(result)
      logsApi.add('PROWLY_FETCH', `Pobrano ${result.length} prasówek z Prowly`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Błąd pobierania'
      setError(msg)
      setPosts([])
      logsApi.add('PROWLY_FETCH_ERROR', `Błąd pobierania prasówek: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { posts, isLoading, error, load }
}

function useProwlySearch(query: string) {
  const [results, setResults] = useState<ProwlyPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchProwlyPosts(query)
        setResults(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Błąd wyszukiwania')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  return { results, isLoading, error }
}

interface ProwlyPickerProps {
  pressMappings: PressMapEntry[] | undefined
  onSelect: (posts: [ProwlyPost | null, ProwlyPost | null]) => void
}

const INST_COLOR = ['#2563eb', '#7c3aed'] as const

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      role="status"
      aria-label="Ładowanie"
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ flexShrink: 0, animation: 'spin 0.7s linear infinite' }}
    >
      <circle cx="7" cy="7" r="5.5" stroke="var(--panel-border)" strokeWidth="2" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatDate(pubDate: string | null): string {
  if (!pubDate) return ''
  try {
    return new Date(pubDate).toLocaleDateString('pl-PL', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return pubDate
  }
}

export default function ProwlyPicker({ pressMappings, onSelect }: ProwlyPickerProps) {
  const [selected, setSelected] = useState<ProwlyPost[]>([])
  const [mode, setMode] = useState<Mode>('recent')
  const [searchQuery, setSearchQuery] = useState('')

  const { posts, isLoading: recentLoading, error: recentError, load } = useProwlyPosts()
  const { results: searchResults, isLoading: searchLoading, error: searchError } = useProwlySearch(searchQuery)

  const hasMappings = pressMappings && pressMappings.length > 0
  const activePosts = mode === 'recent' ? posts : searchResults
  const isLoading = mode === 'recent' ? recentLoading : searchLoading
  const error = mode === 'recent' ? recentError : searchError

  function togglePost(post: ProwlyPost) {
    setSelected((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id)
      let next: ProwlyPost[]
      if (idx >= 0) {
        next = prev.filter((_, i) => i !== idx)
      } else if (prev.length < 2) {
        next = [...prev, post]
      } else {
        return prev
      }
      onSelect([next[0] ?? null, next[1] ?? null])
      return next
    })
  }

  function deselect(slotIndex: number) {
    setSelected((prev) => {
      const next = prev.filter((_, i) => i !== slotIndex)
      onSelect([next[0] ?? null, next[1] ?? null])
      return next
    })
  }

  const showEmptyHint = !isLoading && !error && activePosts.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Selection summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {([0, 1] as const).map((i) => {
          const post = selected[i] ?? null
          const color = INST_COLOR[i]
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${post ? `${color}40` : 'var(--panel-border)'}`,
                background: post ? `${color}09` : 'var(--workspace-bg)',
                minWidth: 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                background: post ? color : 'var(--panel-border)',
                color: post ? '#fff' : 'var(--text-muted)',
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: post ? color : 'var(--text-muted)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  IP {i + 1}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  color: post ? 'var(--text-900)' : 'var(--text-muted)',
                  fontStyle: post ? 'normal' : 'italic',
                  marginLeft: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'inline-block', maxWidth: 'calc(100% - 40px)', verticalAlign: 'bottom',
                }}>
                  {post ? post.title : 'Nie wybrano'}
                </span>
              </div>
              {post && (
                <button
                  onClick={() => deselect(i)}
                  title="Usuń wybór"
                  aria-label={`Usuń wybór IP ${i + 1}`}
                  style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 12, padding: 0,
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!hasMappings && selected.length > 0 && (
        <div style={{
          fontSize: '0.78rem', color: '#b45309',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,.22)',
          borderRadius: 6, padding: '5px 9px',
        }}>
          Szablon nie ma skonfigurowanego mapowania IP — przejdź do zakładki Szablony.
        </div>
      )}

      {/* Segmented tabs */}
      <div style={{
        display: 'flex', borderRadius: 8, padding: 3,
        background: 'var(--workspace-bg)', border: '1px solid var(--panel-border)',
        gap: 2,
      }}>
        {(['recent', 'search'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '5px 8px', borderRadius: 6,
              fontSize: '0.8rem', fontWeight: mode === m ? 600 : 400,
              border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--panel-bg)' : 'transparent',
              color: mode === m ? 'var(--text-900)' : 'var(--text-muted)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {m === 'recent' ? 'Ostatnie' : 'Szukaj po tytule'}
          </button>
        ))}
      </div>

      {/* Controls */}
      {mode === 'recent' ? (
        <button
          onClick={load}
          disabled={recentLoading}
          className="btn btn-sm btn-secondary"
          style={{ width: '100%', justifyContent: 'center', gap: 6 }}
        >
          {recentLoading ? <><Spinner /> Pobieranie…</> : posts.length > 0 ? 'Odśwież listę' : 'Pobierz ostatnie prasówki'}
        </button>
      ) : (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: 10,
            color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
          }}>
            {searchLoading ? <Spinner /> : <SearchIcon />}
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Wpisz tytuł informacji prasowej…"
            className="form-input"
            style={{ width: '100%', paddingLeft: 30, paddingRight: searchQuery ? 28 : undefined }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              style={{
                position: 'absolute', right: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 13, padding: 2, lineHeight: 1,
                display: 'flex', alignItems: 'center',
              }}
            >✕</button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>{error}</p>
      )}

      {/* List */}
      {(activePosts.length > 0 || showEmptyHint) && (
        <div style={{
          maxHeight: 480, overflowY: 'auto',
          border: '1px solid var(--panel-border)', borderRadius: 10,
          background: 'var(--workspace-bg)',
        }}>
          {showEmptyHint ? (
            <div style={{
              padding: '28px 16px', textAlign: 'center',
              fontSize: '0.8rem', color: 'var(--text-muted)',
            }}>
              {mode === 'recent'
                ? 'Kliknij „Pobierz ostatnie prasówki", aby załadować listę.'
                : searchQuery.trim().length < 2
                  ? 'Wpisz co najmniej 2 znaki, aby wyszukać.'
                  : `Nie znaleziono wyników dla „${searchQuery}".`}
            </div>
          ) : (
            <div style={{ padding: 4 }}>
              {activePosts.map((post) => {
                const selIdx = selected.findIndex((p) => p.id === post.id)
                const isSelected = selIdx >= 0
                const instance = isSelected ? ((selIdx + 1) as 1 | 2) : null
                const isDisabled = !isSelected && selected.length >= 2
                const instColor = instance ? INST_COLOR[instance - 1] : undefined

                return (
                  <div
                    key={post.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => !isDisabled && togglePost(post)}
                    onKeyDown={(e) => {
                      if ((e.key === ' ' || e.key === 'Enter') && !isDisabled) {
                        e.preventDefault()
                        togglePost(post)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 8px', marginBottom: 3, borderRadius: 7,
                      border: `2px solid ${isSelected ? instColor! : 'transparent'}`,
                      background: isSelected
                        ? `color-mix(in srgb, ${instColor} 8%, var(--panel-bg))`
                        : 'var(--panel-bg)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.38 : 1,
                      userSelect: 'none',
                      transition: 'border-color 0.15s, background 0.15s, opacity 0.15s',
                    }}
                  >
                    {/* Slot indicator */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      background: isSelected ? instColor! : 'var(--workspace-bg)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      border: isSelected ? 'none' : '1.5px solid var(--panel-border)',
                      transition: 'background 0.15s, color 0.15s',
                    }}>
                      {instance ?? '○'}
                    </div>

                    {/* Thumbnail */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 5, flexShrink: 0,
                      border: '1px solid var(--panel-border)',
                      background: post.image
                        ? `#e5e7eb url(${JSON.stringify(post.image)}) center / cover no-repeat`
                        : '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!post.image && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#d1d5db" strokeWidth="1.5" />
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#d1d5db" />
                          <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8rem', lineHeight: 1.35, color: 'var(--text-900)',
                        fontWeight: isSelected ? 600 : 400,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {post.title}
                      </div>
                      {post.pubDate && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(post.pubDate)}
                        </div>
                      )}
                    </div>

                    {/* IP badge */}
                    {isSelected && (
                      <div style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 99,
                        background: instColor, color: '#fff', whiteSpace: 'nowrap',
                      }}>
                        IP {instance}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom hint when 1 item selected */}
      {selected.length === 1 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          Wybierz jeszcze jedną prasówkę dla IP 2, lub tylko IP 1 zostanie użyte.
        </p>
      )}
    </div>
  )
}
