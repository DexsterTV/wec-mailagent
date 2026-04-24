import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'

const LOGO_URL =
  'https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/1230/assets/826775/-05f2bd38f27c35001ab1be34eaa18753.png'

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(searchParams.get('error') ?? '')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate('/editor', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/editor', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Nieprawidłowy login lub hasło.')
      } else {
        setError('Błąd połączenia z serwerem.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay" style={{ display: 'flex' }}>
      <div className="login-wrapper">

        {/* ── LEFT — brand panel ── */}
        <div className="login-brand">
          <div className="login-brand-blob login-brand-blob--1" />
          <div className="login-brand-blob login-brand-blob--2" />
          <div className="login-brand-blob login-brand-blob--3" />

          <div className="login-brand-identity">
            <div className="login-brand-logo-wrap">
              <img src={LOGO_URL} alt="WEC Communication" className="login-brand-logo-img" referrerPolicy="no-referrer" />
            </div>
            <div className="login-brand-agency">
              <span className="login-brand-agency-name">WEC Communication</span>
              <span className="login-brand-agency-dot" />
              <span className="login-brand-agency-app">Mailing Agent</span>
            </div>
          </div>

          <div className="login-brand-headline">
            <h1>
              Twórz mailingi<br />
              <em>szybko i skutecznie</em>
            </h1>
            <p>
              Kompletna platforma do projektowania, personalizacji i eksportu szablonów
              e-mail dla działu PR.
            </p>
          </div>
        </div>

        {/* ── RIGHT — form card ── */}
        <div className="login-card">
          <div className="login-card-logo">
            <img src={LOGO_URL} alt="WEC" referrerPolicy="no-referrer" />
          </div>

          <p className="login-form-title">Zaloguj się</p>
          <p className="login-form-subtitle">Wprowadź swoje dane dostępowe</p>

          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label htmlFor="username">Nazwa użytkownika lub e-mail</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                required
                placeholder="np. admin lub jan@firma.pl"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Hasło</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logowanie…' : 'Zaloguj się →'}
            </button>
          </form>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            margin: '16px 0', color: 'var(--text-400)', fontSize: 12,
          }}>
            <span style={{ flex: 1, height: 1, background: 'var(--panel-border)' }} />
            lub
            <span style={{ flex: 1, height: 1, background: 'var(--panel-border)' }} />
          </div>

          <a
            href="/api/auth/google"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
          >
            {GOOGLE_ICON}
            Zaloguj przez Google
          </a>

        </div>

      </div>
    </div>
  )
}
