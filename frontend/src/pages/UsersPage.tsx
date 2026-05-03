import { useState, useId } from 'react'
import { useUsers } from '../features/users/useUsers'
import { useAuth } from '../lib/auth'
import { logsApi } from '../lib/api/logs'
import type { User } from '../types'
import type { UserPayload } from '../lib/api/users'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

interface UserModalProps {
  user: Partial<User> | null
  onClose: () => void
  onSave: (data: UserPayload) => Promise<void>
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<'admin' | 'user'>(user?.role ?? 'user')
  const uid = useId()
  const isNew = !user?.username

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value
    const password = get('password')
    if (isNew && !password) { alert('Hasło jest wymagane dla nowego użytkownika.'); return }
    const emailRaw = get('email').trim()
    const canEditTemplatesEl  = form.elements.namedItem('canEditTemplates')  as HTMLInputElement | null
    const canManageContactsEl = form.elements.namedItem('canManageContacts') as HTMLInputElement | null
    const permissions: Record<string, boolean> = role === 'admin'
      ? {}
      : {
          canEditTemplates:  canEditTemplatesEl?.checked  ?? true,
          canManageContacts: canManageContactsEl?.checked ?? true,
        }

    const data: UserPayload = {
      username:    get('username'),
      displayName: get('displayName'),
      email:       emailRaw || null,
      role,
      permissions,
      ...(password ? { password } : {}),
    }
    setSaving(true)
    try { await onSave(data); onClose() }
    catch (err: unknown) { alert(`Błąd: ${(err as Error).message}`) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <button className="close-btn" aria-label="Zamknij" onClick={onClose}>&times;</button>
        <h2>{isNew ? 'Nowy użytkownik' : 'Edytuj użytkownika'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor={`${uid}-username`}>Nazwa użytkownika</label>
            <input id={`${uid}-username`} type="text" name="username" defaultValue={user?.username ?? ''} required
              readOnly={!isNew}
              style={!isNew ? { background: 'rgba(0,0,0,0.04)', cursor: 'not-allowed' } : undefined}
              pattern="[a-zA-Z0-9_.\-]{2,32}" title="2–32 znaków: litery, cyfry, _, ., -"
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-displayName`}>Imię i nazwisko (wyświetlane)</label>
            <input id={`${uid}-displayName`} type="text" name="displayName" defaultValue={user?.displayName ?? ''} required />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-email`}>
              Adres e-mail
              <span style={{ fontSize: 11, color: 'var(--text-400)', marginLeft: 6 }}>
                (wymagany do logowania Google)
              </span>
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              name="email"
              defaultValue={user?.email ?? ''}
              placeholder="jan@firma.pl"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-password`}>{isNew ? 'Hasło' : 'Nowe hasło (zostaw puste = bez zmian)'}</label>
            <input id={`${uid}-password`} type="password" name="password" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor={`${uid}-role`}>Rola</label>
            <select id={`${uid}-role`} name="role" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
              <option value="user">Użytkownik</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {role !== 'admin' && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Uprawnienia:</p>
              <div className="checkbox-group" style={{ marginBottom: 6 }}>
                <input type="checkbox" id="canEditTemplates" name="canEditTemplates"
                  defaultChecked={user?.permissions?.canEditTemplates !== false} />
                <label htmlFor="canEditTemplates">Edycja szablonów</label>
              </div>
              <div className="checkbox-group">
                <input type="checkbox" id="canManageContacts" name="canManageContacts"
                  defaultChecked={user?.permissions?.canManageContacts !== false} />
                <label htmlFor="canManageContacts">Zarządzanie kontaktami</label>
              </div>
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, width: '100%' }} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz użytkownika'}
          </button>
        </form>
      </div>
    </div>
  )
}

const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  admin: { bg: 'rgba(79,70,229,0.1)', color: '#4f46e5', label: 'Administrator' },
  user:  { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Użytkownik' },
}

export default function UsersPage() {
  const { users, saveUser, deleteUser } = useUsers()
  const { user: currentUser } = useAuth()
  const [modalUser, setModalUser] = useState<Partial<User> | null | undefined>(undefined)

  async function handleSave(data: UserPayload) {
    const isNew = !users.find((u) => u.username === data.username)
    await saveUser(data)
    logsApi.add(isNew ? 'USER_ADD' : 'USER_EDIT', `${isNew ? 'Dodano' : 'Edytowano'} użytkownika: ${data.username}`)
  }

  async function handleDelete(u: User) {
    if (u.username === currentUser?.username) { alert('Nie możesz usunąć własnego konta.'); return }
    if (!confirm(`Czy na pewno usunąć użytkownika ${u.displayName}?`)) return
    await deleteUser(u.username)
    logsApi.add('USER_DELETE', `Usunięto użytkownika: ${u.username}`)
  }

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Użytkownicy</span>
          <span style={{ fontSize: 12, color: 'var(--text-400)' }}>
            {users.length} {users.length === 1 ? 'konto' : 'kont'}
          </span>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setModalUser(null)}>
            + Nowy użytkownik
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {users.length === 0 ? (
          <div className="empty-state" style={{ height: 200 }}>
            <p>Brak użytkowników.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {users.map((u) => {
              const role   = ROLE_COLORS[u.role] ?? ROLE_COLORS.user
              const isSelf = u.username === currentUser?.username
              const perms  = u.role === 'admin'
                ? ['Pełne uprawnienia']
                : [
                    u.permissions?.canEditTemplates  !== false && 'Edycja szablonów',
                    u.permissions?.canManageContacts !== false && 'Kontakty',
                  ].filter(Boolean) as string[]

              const hasGoogle = u.authProviders?.includes('google')

              return (
                <div key={u.username} style={{
                  background:   'var(--panel-bg)',
                  border:       `1px solid ${isSelf ? 'var(--primary)' : 'var(--panel-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding:      20,
                  boxShadow:    isSelf ? '0 0 0 3px var(--primary-ring)' : 'var(--shadow-xs)',
                  display:      'flex',
                  flexDirection: 'column',
                  gap:          14,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: `${role.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: role.color,
                      flexShrink: 0,
                    }}>
                      {u.picture
                        ? <img src={u.picture} alt={u.displayName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        : getInitials(u.displayName)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {u.displayName}
                        {isSelf && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', borderRadius: 99, padding: '1px 6px' }}>
                            Ty
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-400)', fontFamily: 'Consolas, monospace' }}>
                        @{u.username}
                      </div>
                      {u.email && (
                        <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 2 }}>
                          {u.email}
                          {hasGoogle && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#4285F4', fontWeight: 600 }}>G</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: role.bg, color: role.color,
                    }}>
                      {role.label}
                    </span>
                  </div>

                  {/* Permissions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {perms.length > 0 ? perms.map((p) => (
                      <span key={p} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 99,
                        background: 'var(--workspace-bg)',
                        color: 'var(--text-500)',
                        border: '1px solid var(--panel-border)',
                      }}>
                        {p}
                      </span>
                    )) : (
                      <span style={{ fontSize: 11, color: 'var(--text-400)', fontStyle: 'italic' }}>
                        Brak uprawnień
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setModalUser(u)}>
                      Edytuj
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{
                        flex: 1,
                        background: isSelf ? 'var(--workspace-bg)' : 'var(--danger-light)',
                        color:      isSelf ? 'var(--text-400)' : 'var(--danger)',
                        border:     'none',
                      }}
                      onClick={() => handleDelete(u)}
                      disabled={isSelf}
                      title={isSelf ? 'Nie możesz usunąć własnego konta' : undefined}
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalUser !== undefined && (
        <UserModal user={modalUser} onClose={() => setModalUser(undefined)} onSave={handleSave} />
      )}
    </div>
  )
}
