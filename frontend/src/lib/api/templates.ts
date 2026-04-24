import { apiClient } from './client'
import type { Template } from '../../types'

export const templatesApi = {
  getAll: () => apiClient.get<Template[] | null>('/templates'),
  save: (tpl: Template) => apiClient.post<Template>('/templates', tpl),
  delete: (id: string) => apiClient.delete<void>(`/templates/${id}`),
}
