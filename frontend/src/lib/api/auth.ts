import { apiClient } from './client'
import type { LoginResponse, User } from '../../types'

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }),

  logout: () => apiClient.post<void>('/auth/logout'),

  me: () => apiClient.get<User>('/auth/me'),
}
