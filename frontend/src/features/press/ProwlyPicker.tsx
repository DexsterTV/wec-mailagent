import { useState, useCallback } from 'react'
import { fetchProwlyPosts } from '../../lib/api/prowly'
import { logsApi } from '../../lib/api/logs'
import type { ProwlyPost, PressMapEntry } from '../../types'

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

interface ProwlyPickerProps {
  pressMappings: PressMapEntry[] | undefined
  onSelect: (posts: [ProwlyPost | null, ProwlyPost | null]) => void
}

const INST_COLOR = ['#2563eb', '#7c3aed'] as const

export default function ProwlyPicker({ pressMappings, onSelect }: ProwlyPickerProps) {
  const [selected, setSelected] = useState<ProwlyPost[]>([])
  const { posts, isLoading, error, load } = useProwlyPosts()

  const hasMappings = pressMappings && pressMappings.length > 0
  const selectionSlots = [selected[0] ?? null, selected[1] ?? null] as const

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

  function formatDate(pubDate: string | null): string {
    if (!pubDate) return ''
    try {
      return new Date(pubDate).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return pubDate
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={load}
        disabled={isLoading}
        className="btn btn-sm btn-secondary"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {isLoading ? 'Pobieranie…' : posts.length > 0 ? 'Odśwież prasówki' : 'Pobierz najnowsze prasówki'}
      </button>

      {!hasMappings && posts.length > 0 && (
        <p
          style={{
            fontSize: '0.8rem',
            color: '#b45309',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 4,
            padding: '5px 8px',
          }}
        >
          Szablon nie ma skonfigurowanego mapowania IP — przejdź do zakładki Szablony.
        </p>
      )}

      {error && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>}

      {posts.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([0, 1] as const).map((i) => {
              const post = selectionSlots[i]
              const color = INST_COLOR[i]

              return (
                <div
                  key={i}
                  style={{
                    padding: '9px 10px',
                    borderRadius: 8,
                    border: `1px solid ${post ? `${color}55` : 'var(--panel-border)'}`,
                    background: post ? `${color}11` : 'var(--panel-bg)',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: post ? color : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 4,
                    }}
                  >
                    Informacja prasowa {i + 1}
                  </div>
                  {post ? (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-900)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.title}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Nic nie wybrano
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Dostępne prasówki</span>
            <span>Wybierz maksymalnie 2 pozycje</span>
          </div>

          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              padding: 4,
              border: '1px solid var(--panel-border)',
              borderRadius: 10,
              background: 'var(--workspace-bg)',
            }}
          >
            {posts.map((post) => {
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 8px',
                    marginBottom: 5,
                    borderRadius: 7,
                    border: `2px solid ${isSelected ? instColor! : 'var(--panel-border)'}`,
                    background: isSelected
                      ? `color-mix(in srgb, ${instColor} 9%, var(--panel-bg))`
                      : 'var(--panel-bg)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                    userSelect: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      background: isSelected ? instColor! : 'var(--workspace-bg)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      border: isSelected ? 'none' : '1.5px solid var(--panel-border)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {instance ?? '○'}
                  </div>

                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 5,
                      flexShrink: 0,
                      border: '1px solid var(--panel-border)',
                      background: post.image
                        ? `#e5e7eb url(${JSON.stringify(post.image)}) center / cover no-repeat`
                        : '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {!post.image && (
                      <div
                        style={{
                          fontSize: 9,
                          color: '#9ca3af',
                          textAlign: 'center',
                          lineHeight: 1.2,
                          padding: 2,
                        }}
                      >
                        Brak
                        <br />
                        zdjęcia
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        lineHeight: 1.35,
                        color: 'var(--text-900)',
                        fontWeight: isSelected ? 600 : 400,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {post.title}
                    </div>
                    {post.pubDate && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatDate(post.pubDate)}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: 99,
                        background: instColor,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      IP {instance}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selected.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Kliknij prasówkę, aby przypisać ją do IP 1. Kliknij drugą dla IP 2.
            </p>
          )}
          {selected.length === 1 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Wybierz jeszcze jedną prasówkę dla IP 2.
            </p>
          )}
        </>
      )}
    </div>
  )
}
