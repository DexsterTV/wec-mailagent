import { apiClient } from './client'
import type { User } from '../../types'

export interface UserPayload {
  username: string
  displayName: string
  password?: string
  role: 'admin' | 'user'
  permissions: Record<string, boolean>
}

export const usersApi = {
  getAll: () => apiClient.get<User[]>('/users'),
  save: (data: UserPayload) => apiClient.post<User>('/users', data),
  delete: (username: string) => apiClient.delete<void>(`/users/${username}`),
}
