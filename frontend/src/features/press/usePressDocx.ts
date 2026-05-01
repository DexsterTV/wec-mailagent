import { useState, useEffect, useRef } from 'react'
import { resolveDocx } from '../../lib/api/prowly'

export function usePressDocx(pressUrl: string) {
  const [docxUrl, setDocxUrl] = useState<string>('')
  const [resolving, setResolving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!pressUrl.trim()) {
      setDocxUrl('')
      setResolving(false)
      return
    }

    setResolving(true)
    timerRef.current = setTimeout(() => {
      resolveDocx(pressUrl)
        .then((url) => setDocxUrl(url))
        .catch(() => setDocxUrl(''))
        .finally(() => setResolving(false))
    }, 600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pressUrl])

  return { docxUrl, resolving }
}
