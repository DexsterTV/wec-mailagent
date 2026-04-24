import { apiClient } from './client'
import type { Contact } from '../../types'

export const contactsApi = {
  getAll: () => apiClient.get<Contact[]>('/contacts'),
  save: (contact: Partial<Contact>) => apiClient.post<Contact>('/contacts', contact),
  delete: (id: string) => apiClient.delete<void>(`/contacts/${id}`),
}
