import { apiClient } from './client'
import type { LogEntry, LogAction } from '../../types'

export const logsApi = {
  getAll: () => apiClient.get<LogEntry[]>('/logs'),
  add: (action: LogAction, details?: string): void => {
    const entry: Omit<LogEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      user: sessionStorage.getItem('wec_user') ?? 'unknown',
      action,
      details,
    }
    apiClient.post('/logs', entry).catch(() => {})
  },
  clear: () => apiClient.delete<void>('/logs'),
  getCsvBlob: () => apiClient.getBlob('/logs/csv'),
}
