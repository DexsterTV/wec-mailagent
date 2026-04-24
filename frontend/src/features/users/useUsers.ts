import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserPayload } from '../../lib/api/users'

export function useUsers() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  })

  const saveMutation = useMutation({
    mutationFn: (data: UserPayload) => usersApi.save(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => usersApi.delete(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    saveUser: saveMutation.mutateAsync,
    deleteUser: deleteMutation.mutateAsync,
  }
}
