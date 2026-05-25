'use strict'

const http  = require('http')
const https = require('https')
const { readData } = require('./storage')
const { addServerLog } = require('./logs')

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const PRIVATE_IP = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|0\.0\.0\.0)/i

function validateUrl(raw) {
  let u
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (PRIVATE_IP.test(u.hostname)) return null
  return u
}

function fetchText(rawUrl, maxRedirects = 5) {
  const u = validateUrl(rawUrl)
  if (!u) return Promise.reject(new Error(`Niedozwolony URL: ${rawUrl}`))

  return new Promise((resolve, reject) => {
    const client = u.protocol === 'https:' ? https : http
    const req = client.get(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WECMailingAgent/1.0)',
        Accept: 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
      },
      timeout: 10000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, rawUrl).href
        res.resume()
        return fetchText(redirectUrl, maxRedirects - 1).then(resolve, reject)
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      res.setEncoding('utf8')
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout połączenia')) })
  })
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function cdataStrip(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function htmlEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function tagContent(xml, tag) {
  const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m  = xml.match(re)
  if (!m) return null
  return htmlEntities(cdataStrip(m[1])).trim() || null
}

function attrValue(xml, tag, attr) {
  const re = new RegExp(`<${tag}[\\s\\S]*?\\s${attr}=["']([^"']+)["']`, 'i')
  const m  = xml.match(re)
  return m ? m[1].trim() : null
}

function firstImgSrc(html) {
  if (!html) return null
  const m = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  return m ? m[1] : null
}

// ─── RSS 2.0 ──────────────────────────────────────────────────────────────────

function parseRssItems(xml, limit = 5) {
  const items = []
  const re    = /<item[^>]*>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) !== null && (limit === 0 || items.length < limit)) {
    const b = m[1]
    const title   = tagContent(b, 'title')   || '(bez tytułu)'
    const link    = tagContent(b, 'link')    || tagContent(b, 'guid') || ''
    const pubDate = tagContent(b, 'pubDate') || null

    let image = attrValue(b, 'enclosure', 'url')
             || attrValue(b, 'media:content', 'url')
             || attrValue(b, 'media:thumbnail', 'url')

    if (!image) {
      const desc = tagContent(b, 'description') || tagContent(b, 'content:encoded') || ''
      image = firstImgSrc(desc)
    }

    items.push({ id: link || String(items.length), title, link, pubDate, image, _needsFetch: !image && !!link })
  }
  return items
}

// ─── Atom 1.0 ─────────────────────────────────────────────────────────────────

function parseAtomItems(xml, limit = 5) {
  const items = []
  const re    = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  let m
  while ((m = re.exec(xml)) !== null && (limit === 0 || items.length < limit)) {
    const b = m[1]
    const title   = tagContent(b, 'title') || '(bez tytułu)'
    // Atom: <link href="..." rel="alternate"> — prefer rel=alternate or first link
    const linkAlt = b.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    const linkAny = b.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)
    const link    = (linkAlt ? linkAlt[1] : linkAny ? linkAny[1] : tagContent(b, 'link')) || ''
    const pubDate = tagContent(b, 'published') || tagContent(b, 'updated') || null

    let image = attrValue(b, 'media:thumbnail', 'url')
             || attrValue(b, 'media:content', 'url')

    if (!image) {
      const content = tagContent(b, 'content') || tagContent(b, 'summary') || ''
      image = firstImgSrc(content)
    }

    items.push({ id: link || String(items.length), title, link, pubDate, image, _needsFetch: !image && !!link })
  }
  return items
}

function parseItems(xml, limit = 5) {
  if (/<feed[\s>]/i.test(xml)) return parseAtomItems(xml, limit)
  return parseRssItems(xml, limit)
}

// ─── og:image scraper ────────────────────────────────────────────────────────

function extractOgImage(html) {
  const m = html.match(/<meta\b[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
           || html.match(/<meta\b[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i)
  if (m) return m[1]
  const imgs = Array.from(html.matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi), (x) => x[1])
  return imgs.find((src) => !/logo|icon|avatar|sprite|pixel|blank/i.test(src)) || null
}

async function resolveImages(items) {
  await Promise.all(
    items.map(async (item) => {
      if (!item._needsFetch) return
      try {
        const html = await Promise.race([
          fetchText(item.link),
          new Promise((_, rej) => setTimeout(() => rej(new Error('img timeout')), 6000)),
        ])
        item.image = extractOgImage(html)
      } catch {
        item.image = null
      }
    }),
  )
  items.forEach((item) => { delete item._needsFetch })
}

// ─── Router ──────────────────────────────────────────────────────────────────

function makeProwlyRouter(middleware) {
  const router = require('express').Router()

  // GET /api/prowly/posts — reads RSS URL from system settings
  router.get('/posts', middleware.requireAuth, async (req, res) => {
    const settings = readData('settings.json', {})
    const rssUrl   = settings.prowlyRssUrl

    if (!rssUrl || !rssUrl.trim()) {
      return res.status(400).json({ error: 'URL RSS newsroomu nie jest skonfigurowany. Skontaktuj się z administratorem.' })
    }
    if (!validateUrl(rssUrl)) {
      return res.status(400).json({ error: 'Skonfigurowany URL RSS jest nieprawidłowy.' })
    }

    try {
      const xml   = await fetchText(rssUrl)
      const items = parseItems(xml)
      if (items.length === 0) {
        addServerLog(req.user.username, 'PROWLY_FETCH_ERROR', `Brak wpisów w feedzie: ${rssUrl}`)
        return res.status(422).json({ error: 'Nie znaleziono wpisów w feedzie. Sprawdź, czy URL wskazuje na RSS lub Atom newsroomu Prowly.' })
      }
      await resolveImages(items)
      console.log(`[Prowly] Pobrano ${items.length} wpisów dla ${req.user.username}`)
      addServerLog(req.user.username, 'PROWLY_FETCH', `Pobrano ${items.length} prasówek z: ${rssUrl}`)
      res.json(items)
    } catch (err) {
      console.error('[Prowly]', err.message)
      addServerLog(req.user.username, 'PROWLY_FETCH_ERROR', `Błąd pobierania feedu (${rssUrl}): ${err.message}`)
      res.status(500).json({ error: `Błąd pobierania feedu: ${err.message}` })
    }
  })

  // GET /api/prowly/search?q=... — searches all RSS items by title (no image resolution)
  router.get('/search', middleware.requireAuth, async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    if (q.length < 2) return res.json([])

    const settings = readData('settings.json', {})
    const rssUrl   = settings.prowlyRssUrl

    if (!rssUrl || !rssUrl.trim()) {
      return res.status(400).json({ error: 'URL RSS newsroomu nie jest skonfigurowany.' })
    }
    if (!validateUrl(rssUrl)) {
      return res.status(400).json({ error: 'Skonfigurowany URL RSS jest nieprawidłowy.' })
    }

    try {
      const xml   = await fetchText(rssUrl)
      const all   = parseItems(xml, 0)

      // Score-based fuzzy match with Polish-friendly prefix matching.
      // - Full phrase match: +100
      // - Word match: +10
      // - Stem match (first 4-5 chars): +3 — handles "promocje" vs "promocjami" etc.
      const words = q.split(/\s+/).filter((w) => w.length >= 2)
      const matched = []
      const unmatched = []

      for (const item of all) {
        const title = item.title.toLowerCase()
        let score = 0
        if (title.includes(q)) score += 100
        for (const w of words) {
          if (title.includes(w)) {
            score += 10
          } else if (w.length >= 4) {
            const stem = w.slice(0, Math.min(w.length, 5))
            if (title.includes(stem)) score += 3
          }
        }
        if (score > 0) matched.push({ item, score })
        else unmatched.push(item)
      }

      matched.sort((a, b) => b.score - a.score)
      let hits = matched.slice(0, 20).map((x) => x.item)

      // Always show at least 5 suggestions — pad with most-recent unmatched items
      // (RSS order is typically newest first) so the user always has alternatives.
      const MIN_RESULTS = 5
      if (hits.length < MIN_RESULTS) {
        hits = hits.concat(unmatched.slice(0, MIN_RESULTS - hits.length))
      }

      hits.forEach((item) => { delete item._needsFetch })
      res.json(hits)
    } catch (err) {
      res.status(500).json({ error: `Błąd wyszukiwania: ${err.message}` })
    }
  })

  // POST /api/prowly/resolve-docx — fetches .docx URL for a press release
  router.post('/resolve-docx', middleware.requireAuth, async (req, res) => {
    const { pressUrl } = req.body ?? {}
    if (!pressUrl || typeof pressUrl !== 'string') {
      return res.status(400).json({ error: 'Wymagane pole: pressUrl' })
    }

    const m = pressUrl.match(/media\.wec24\.pl\/(\d+)/)
    if (!m) {
      return res.status(400).json({ error: 'Nie udało się znaleźć ID prasówki w podanym URL.' })
    }
    const storyId = m[1]

    try {
      const docxData = await postEmptyForJson(storyId)
      const docxUrl  = extractDocxUrl(docxData)
      if (!docxUrl) return res.status(422).json({ error: 'Nie znaleziono linku .docx w odpowiedzi Prowly.' })
      res.json({ docxUrl })
    } catch (err) {
      res.status(500).json({ error: `Błąd pobierania .docx: ${err.message}` })
    }
  })

  return router
}

// ─── Prowly docx helpers ─────────────────────────────────────────────────────

function postEmptyForJson(storyId) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'media.wec24.pl',
        path: `/${storyId}//docx`,
        headers: {
          'Content-Length': '0',
          'User-Agent': 'Mozilla/5.0 (compatible; WECMailingAgent/1.0)',
          Accept: 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { resolve(null) }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    req.end()
  })
}

function extractDocxUrl(data) {
  if (!data) return null
  const candidates = ['url', 'docx_url', 'download_url', 'file_url', 'asset_url', 'attachment_url']
  for (const key of candidates) {
    if (typeof data[key] === 'string' && data[key].includes('.docx')) return data[key]
  }
  return deepFindDocx(data)
}

function deepFindDocx(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return null
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' && val.includes('.docx')) return val
    if (typeof val === 'object') {
      const found = deepFindDocx(val, depth + 1)
      if (found) return found
    }
  }
  return null
}

module.exports = { makeProwlyRouter }
