function key(templateId: string, username: string) {
  return `wec_draft_${username}_${templateId}`
}

export const drafts = {
  save(templateId: string, values: Record<string, string>) {
    const user = sessionStorage.getItem('wec_user') ?? 'anon'
    localStorage.setItem(key(templateId, user), JSON.stringify(values))
  },
  get(templateId: string): Record<string, string> | null {
    const user = sessionStorage.getItem('wec_user') ?? 'anon'
    const raw = localStorage.getItem(key(templateId, user))
    return raw ? JSON.parse(raw) : null
  },
  clear(templateId: string) {
    const user = sessionStorage.getItem('wec_user') ?? 'anon'
    localStorage.removeItem(key(templateId, user))
  },
}
