import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { AuthUser, Permissions } from '../../types'
import { authApi } from '../api/auth'
import { logsApi } from '../api/logs'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: () => boolean
  hasPermission: (key: keyof Permissions) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function saveSession(user: AuthUser) {
  sessionStorage.setItem('wec_token', user.token)
  sessionStorage.setItem('wec_user', user.username)
  sessionStorage.setItem('wec_role', user.role)
  sessionStorage.setItem('wec_display_name', user.displayName)
  sessionStorage.setItem('wec_permissions', JSON.stringify(user.permissions))
}

function clearSession() {
  sessionStorage.removeItem('wec_token')
  sessionStorage.removeItem('wec_user')
  sessionStorage.removeItem('wec_role')
  sessionStorage.removeItem('wec_display_name')
  sessionStorage.removeItem('wec_permissions')
}

function readSession(): AuthUser | null {
  const token = sessionStorage.getItem('wec_token')
  const username = sessionStorage.getItem('wec_user')
  const role = sessionStorage.getItem('wec_role') as AuthUser['role'] | null
  const displayName = sessionStorage.getItem('wec_display_name')
  const rawPerms = sessionStorage.getItem('wec_permissions')
  if (!token || !username || !role || !displayName) return null
  const permissions: Permissions = rawPerms ? JSON.parse(rawPerms) : {}
  return { token, username, role, displayName, permissions }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = readSession()
    if (!stored) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then(() => setUser(stored))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await authApi.login(username, password)
      const authUser: AuthUser = {
        token: data.token,
        username: data.username,
        role: data.role,
        displayName: data.displayName,
        permissions: data.permissions,
      }
      saveSession(authUser)
      setUser(authUser)
      logsApi.add('LOGIN', `Zalogowano jako: ${data.username} (${data.role})`)
    } catch (err) {
      logsApi.add('LOGIN_FAIL', `Nieudana próba logowania: ${username} — ${err instanceof Error ? err.message : 'błąd'}`)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    logsApi.add('LOGOUT', `Wylogowano: ${user?.username}`)
    await authApi.logout().catch(() => {})
    clearSession()
    setUser(null)
  }, [user])

  const isAdmin = useCallback(() => user?.role === 'admin', [user])

  const hasPermission = useCallback(
    (key: keyof Permissions) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return user.permissions[key] !== false
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
