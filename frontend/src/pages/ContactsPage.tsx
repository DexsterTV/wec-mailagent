import { useState } from 'react'
import { useContacts } from '../features/contacts/useContacts'
import { logsApi } from '../lib/api/logs'
import type { Contact } from '../types'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

interface ContactModalProps {
  contact: Partial<Contact> | null
  onClose: () => void
  onSave: (data: Partial<Contact>) => Promise<void>
}

function ContactModal({ contact, onClose, onSave }: ContactModalProps) {
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data: Partial<Contact> = {
      ...(contact?.id ? { id: contact.id } : {}),
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      position: (form.elements.namedItem('position') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
    }
    setSaving(true)
    try {
      await onSave(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>{contact?.id ? 'Edytuj kontakt' : 'Dodaj kontakt'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Imię i nazwisko</label>
            <input type="text" name="name" defaultValue={contact?.name ?? ''} required />
          </div>
          <div className="form-group">
            <label>Stanowisko / firma – agencja</label>
            <input
              type="text"
              name="position"
              defaultValue={contact?.position ?? ''}
              placeholder="np. PR Manager, WEC Agency"
              required
            />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" name="email" defaultValue={contact?.email ?? ''} required />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input type="tel" name="phone" defaultValue={contact?.phone ?? ''} />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 8, width: '100%' }}
            disabled={saving}
          >
            {saving ? 'Zapisywanie…' : 'Zapisz kontakt'}
          </button>
        </form>
      </div>
    </div>
  )
}

const AVATAR_COLORS = [
  { bg: 'rgba(79,70,229,0.15)', color: '#4f46e5' },
  { bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  { bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  { bg: 'rgba(239,68,68,0.15)', color: '#dc2626' },
  { bg: 'rgba(139,92,246,0.15)', color: '#7c3aed' },
  { bg: 'rgba(8,145,178,0.15)', color: '#0e7490' },
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export default function ContactsPage() {
  const { contacts, saveContact, deleteContact } = useContacts()
  const [modalContact, setModalContact] = useState<Partial<Contact> | null | undefined>(undefined)
  const [search, setSearch] = useState('')

  async function handleSave(data: Partial<Contact>) {
    await saveContact(data)
    if (data.id) {
      logsApi.add('CONTACT_EDIT', `Edytowano kontakt: ${data.name}`)
    } else {
      logsApi.add('CONTACT_ADD', `Dodano kontakt: ${data.name}`)
    }
  }

  async function handleDelete(c: Contact) {
    if (!confirm('Czy na pewno usunąć ten kontakt?')) return
    await deleteContact(c.id)
    logsApi.add('CONTACT_DELETE', `Usunięto kontakt: ${c.name}`)
  }

  const filtered = search.trim()
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.position ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  return (
    <div className="app-view active">
      <div className="view-topbar">
        <div className="topbar-left">
          <span className="topbar-title">Baza PR</span>
          {contacts.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-400)' }}>
              {contacts.length} {contacts.length === 1 ? 'kontakt' : 'kontaktów'}
            </span>
          )}
        </div>
        <div className="topbar-right">
          {contacts.length > 0 && (
            <input
              type="search"
              placeholder="Szukaj kontaktów…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                border: '1px solid var(--panel-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--workspace-bg)',
                color: 'var(--text-900)',
                width: 200,
                outline: 'none',
              }}
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setModalContact(null)}>
            + Dodaj kontakt
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {contacts.length === 0 ? (
          <div className="empty-state" style={{ height: 200 }}>
            <svg className="empty-state-icon" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>Brak kontaktów PR. Kliknij „+ Dodaj kontakt", aby dodać pierwszy.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ height: 200 }}>
            <p>Brak wyników dla „{search}".</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {filtered.map((c) => {
              const av = avatarColor(c.name)
              return (
                <div key={c.id} style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: av.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: av.color,
                      flexShrink: 0,
                    }}>
                      {getInitials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      {c.position && (
                        <div style={{ fontSize: 12, color: 'var(--text-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.position}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="var(--text-400)" strokeWidth="2" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.email}
                        </a>
                      </div>
                    )}
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="var(--text-400)" strokeWidth="2" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.82a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span style={{ fontSize: 12, color: 'var(--text-500)' }}>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setModalContact(c)}>
                      Edytuj
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
                      onClick={() => handleDelete(c)}
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

      {modalContact !== undefined && (
        <ContactModal
          contact={modalContact}
          onClose={() => setModalContact(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
