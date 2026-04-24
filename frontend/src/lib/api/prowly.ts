import type { ProwlyPost } from '../../types'

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
