import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function GoogleCallbackPage() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const token = params.get('token')
    if (!token) {
      navigate('/login?error=' + encodeURIComponent('Brak tokena po logowaniu Google'), { replace: true })
      return
    }

    loginWithToken(token)
      .then(() => navigate('/editor', { replace: true }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Błąd logowania przez Google'
        navigate('/login?error=' + encodeURIComponent(msg), { replace: true })
      })
  }, [])

  return <div className="loading-spinner" />
}
