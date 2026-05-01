import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { applyTheme, getStoredTheme } from '../lib/utils/theme'
import { CHANGELOG } from '../data/changelog'

const APP_VERSION = '0.2.1'

const LOGO_URL =
  'https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/1230/assets/826775/-05f2bd38f27c35001ab1be34eaa18753.png'

const SECTION_COLORS: Record<string, string> = {
  'Nowe funkcje': '#2563eb',
  'Poprawki i ulepszenia': '#7c3aed',
  'Pierwsze wydanie': '#16a34a',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        width: 480, maxWidth: 'calc(100vw - 32px)',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--panel-border)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-900)' }}>
              Historia zmian
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              WEC Mailing Agent · aktualna wersja v{APP_VERSION}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
              padding: '2px 6px', borderRadius: 6,
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--workspace-bg)'; e.currentTarget.style.color = 'var(--text-900)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '8px 0 20px' }}>
          {CHANGELOG.map((entry, ei) => (
            <div key={entry.version} style={{ padding: '12px 20px 0' }}>
              {/* Version header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 10,
                paddingBottom: ei > 0 ? 0 : 0,
                paddingTop: ei > 0 ? 12 : 0,
                borderTop: ei > 0 ? '1px solid var(--panel-border)' : 'none',
              }}>
                <span style={{
                  fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-900)',
                }}>
                  v{entry.version}
                </span>
                {ei === 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: '#dcfce7', color: '#16a34a', letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    Aktualna
                  </span>
                )}
                <span style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto',
                }}>
                  {entry.date}
                </span>
              </div>

              {entry.sections.map((section) => {
                const color = SECTION_COLORS[section.label] ?? 'var(--text-muted)'
                return (
                  <div key={section.label} style={{ marginBottom: 10 }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color, marginBottom: 5,
                    }}>
                      {section.label}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {section.items.map((item) => (
                        <li key={item} style={{
                          fontSize: '0.82rem', color: 'var(--text-900)', lineHeight: 1.45,
                        }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>(getStoredTheme)
  const [showChangelog, setShowChangelog] = useState(false)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <>
      <nav className="sidebar">
        {/* Logo / brand header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img
              src={LOGO_URL}
              alt="WEC"
              className="sidebar-logo-img"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="sidebar-logo-text">
            <strong>WEC Mailing Agent</strong>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section-label">Praca</div>

          <NavLink to="/editor" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="nav-item-label">Edytor</span>
          </NavLink>

          <NavLink to="/contacts" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="nav-item-label">Baza PR</span>
          </NavLink>

          <div className="sidebar-section-label">Administracja</div>

          <NavLink to="/templates" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span className="nav-item-label">Szablony</span>
          </NavLink>

          {isAdmin() && (
            <>
              <NavLink to="/logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="nav-item-label">Logi systemu</span>
              </NavLink>

              <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <line x1="19" y1="8" x2="23" y2="8" />
                  <line x1="21" y1="6" x2="21" y2="10" />
                </svg>
                <span className="nav-item-label">Użytkownicy</span>
              </NavLink>

              <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="nav-item-label">Ustawienia</span>
              </NavLink>
            </>
          )}
        </div>

        {/* Version strip */}
        <div className="sidebar-version">
          <span>WEC Mailing Agent</span>
          <button
            onClick={() => setShowChangelog(true)}
            className="sidebar-version-badge"
            style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0, font: 'inherit' }}
            title="Zobacz historię zmian"
          >
            v{APP_VERSION}
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">{user ? getInitials(user.displayName) : '?'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.displayName}</div>
            <div className="sidebar-user-role">
              {user?.role === 'admin' ? 'Administrator' : 'Użytkownik'}
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button className="btn-sidebar-icon" title="Przełącz motyw" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button className="btn-sidebar-icon" title="Wyloguj się" onClick={logout}>
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </>
  )
}
