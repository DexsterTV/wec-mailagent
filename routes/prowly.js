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

function parseRssItems(xml) {
  const items = []
  const re    = /<item[^>]*>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) !== null && items.length < 5) {
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

function parseAtomItems(xml) {
  const items = []
  const re    = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  let m
  while ((m = re.exec(xml)) !== null && items.length < 5) {
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

function parseItems(xml) {
  // Atom feeds have <feed> root; RSS feeds have <rss> or <channel>
  if (/<feed[\s>]/i.test(xml)) return parseAtomItems(xml)
  return parseRssItems(xml)
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

// ─── Prowly docx resolver ────────────────────────────────────────────────────

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
        if (res.statusCode < 200 || res.statusCode >= 400) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        res.setEncoding('utf8')
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { reject(new Error('Nieprawidłowa odpowiedź JSON od Prowly')) }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout połączenia')) })
    req.end()
  })
}

function extractDocxUrl(data) {
  for (const key of ['url', 'docx_url', 'download_url', 'link', 'href', 'file_url']) {
    if (typeof data[key] === 'string' && data[key].startsWith('http')) return data[key]
  }
  function deepSearch(obj) {
    if (!obj || typeof obj !== 'object') return null
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val.includes('.docx')) return val
      const found = deepSearch(val)
      if (found) return found
    }
    return null
  }
  return deepSearch(data)
}

// ─── Router ──────────────────────────────────────────────────────────────────

function makeProwlyRouter(middleware) {
  const router = require('express').Router()

  // POST /api/prowly/resolve-docx — resolves press URL to a .docx S3 link
  router.post('/resolve-docx', middleware.requireAuth, async (req, res) => {
    const { pressUrl } = req.body
    if (!pressUrl || typeof pressUrl !== 'string') {
      return res.status(400).json({ error: 'Brak lub nieprawidłowy pressUrl' })
    }
    const match = pressUrl.match(/media\.wec24\.pl\/(\d+)/)
    if (!match) {
      return res.status(400).json({ error: 'Nie można wyciągnąć ID pressa. Upewnij się, że URL pochodzi z domeny media.wec24.pl.' })
    }
    const storyId = match[1]
    try {
      const data = await postEmptyForJson(storyId)
      const docxUrl = extractDocxUrl(data)
      if (!docxUrl) {
        return res.status(422).json({ error: 'Prowly nie zwróciło URL do pliku .docx' })
      }
      addServerLog(req.user.username, 'PRESS_DOCX_RESOLVE', `Rozwiązano docx dla story ${storyId}`)
      res.json({ docxUrl })
    } catch (err) {
      console.error('[Press docx]', err.message)
      addServerLog(req.user.username, 'PRESS_DOCX_ERROR', `Błąd resolve docx story ${storyId}: ${err.message}`)
      res.status(500).json({ error: `Błąd pobierania linku .docx: ${err.message}` })
    }
  })

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

  return router
}

module.exports = { makeProwlyRouter }
