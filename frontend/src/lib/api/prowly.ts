import type { ProwlyPost } from '../../types'

export async function searchProwlyPosts(query: string): Promise<ProwlyPost[]> {
  if (query.trim().length < 2) return []
  const token = sessionStorage.getItem('wec_token') ?? ''
  const res = await fetch(`/api/prowly/search?q=${encodeURIComponent(query.trim())}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

export async function fetchProwlyPosts(): Promise<ProwlyPost[]> {
  const token = sessionStorage.getItem('wec_token') ?? ''
  const res = await fetch('/api/prowly/posts', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

export async function resolveDocx(pressUrl: string): Promise<string> {
  const token = sessionStorage.getItem('wec_token') ?? ''
  const res = await fetch('/api/prowly/resolve-docx', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pressUrl }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  const data = await res.json()
  return data.docxUrl as string
}
