import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '../../lib/api/contacts'
import type { Contact } from '../../types'

export function useContacts() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getAll(),
  })

  const saveMutation = useMutation({
    mutationFn: (contact: Partial<Contact>) => contactsApi.save(contact),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    saveContact: saveMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
  }
}
