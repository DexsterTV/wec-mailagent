import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '../../lib/api/templates'
import { DEFAULT_TEMPLATES } from '../../lib/utils/defaultTemplates'
import type { Template } from '../../types'

export function useTemplates() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const data = await templatesApi.getAll()
      if (!data) {
        // First run — seed defaults
        for (const tpl of DEFAULT_TEMPLATES) {
          await templatesApi.save(tpl)
        }
        return DEFAULT_TEMPLATES
      }
      // Auto-upgrade templates that have a newer default version
      const merged = [...data]
      for (const def of DEFAULT_TEMPLATES) {
        const existing = merged.find((t) => t.id === def.id)
        if (!existing) {
          merged.push(def)
          await templatesApi.save(def)
        } else if ((def._v ?? 0) > (existing._v ?? 0)) {
          const idx = merged.indexOf(existing)
          merged[idx] = def
          await templatesApi.save(def)
        }
      }
      return merged
    },
  })

  const saveMutation = useMutation({
    mutationFn: (tpl: Template) => templatesApi.save(tpl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    saveTemplate: saveMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  }
}
