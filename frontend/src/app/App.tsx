import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getStoredTheme, applyTheme } from '../lib/utils/theme'
import LoginPage from '../pages/LoginPage'
import GoogleCallbackPage from '../pages/GoogleCallbackPage'
import AppShell from './AppShell'
import EditorPage from '../pages/EditorPage'
import ContactsPage from '../pages/ContactsPage'
import TemplatesPage from '../pages/TemplatesPage'
import LogsPage from '../pages/LogsPage'
import UsersPage from '../pages/UsersPage'
import SettingsPage from '../pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="loading-spinner" />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/editor" replace />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/editor" replace />} />
    </Routes>
  )
}
