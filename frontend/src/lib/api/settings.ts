export interface AppSettings {
  prowlyRssUrl?: string
}

async function request<T>(method: string, body?: unknown): Promise<T> {
  const token = sessionStorage.getItem('wec_token') ?? ''
  const res = await fetch('/api/settings', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const b = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(b.error ?? res.statusText)
  }
  return res.json()
}

export const settingsApi = {
  get: () => request<AppSettings>('GET'),
  save: (data: Partial<AppSettings>) => request<AppSettings>('PUT', data),
}
