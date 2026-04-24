import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'

const LOGO_URL =
  'https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/1230/assets/826775/-05f2bd38f27c35001ab1be34eaa18753.png'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
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
        setError('Nieprawidłowa nazwa użytkownika lub hasło.')
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
          {/* Decorative blobs */}
          <div className="login-brand-blob login-brand-blob--1" />
          <div className="login-brand-blob login-brand-blob--2" />
          <div className="login-brand-blob login-brand-blob--3" />

          {/* Agency identity */}
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

          {/* Main headline */}
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
          {/* Logo repeat on card */}
          <div className="login-card-logo">
            <img src={LOGO_URL} alt="WEC" referrerPolicy="no-referrer" />
          </div>

          <p className="login-form-title">Zaloguj się</p>
          <p className="login-form-subtitle">Wprowadź swoje dane dostępowe</p>

          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label htmlFor="username">Nazwa użytkownika</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                required
                placeholder="np. admin"
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

        </div>

      </div>
    </div>
  )
}
