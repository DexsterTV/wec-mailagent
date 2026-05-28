'use strict'

const express = require('express')
const { readData, writeData } = require('./storage')

const COLLABORATION_STATUSES = ['PLANOWANA', 'ZREALIZOWANA', 'ANULOWANA']
const PRICE_TYPES = ['NETTO', 'BRUTTO']

const DEFAULT_TYPES = [
  { name: 'Artykuł natywny',      slug: 'artykul-natywny',      sortOrder: 10 },
  { name: 'Artykuł sponsorowany', slug: 'artykul-sponsorowany', sortOrder: 20 },
  { name: 'Wideo',                slug: 'wideo',                sortOrder: 30 },
  { name: 'Short',                slug: 'short',                sortOrder: 40 },
  { name: 'Reel',                 slug: 'reel',                 sortOrder: 50 },
  { name: 'Post social',          slug: 'post-social',          sortOrder: 60 },
  { name: 'Relacja / Story',      slug: 'relacja-story',        sortOrder: 70 },
  { name: 'Podcast',              slug: 'podcast',              sortOrder: 80 },
  { name: 'Recenzja',             slug: 'recenzja',             sortOrder: 90 },
  { name: 'Inne',                 slug: 'inne',                 sortOrder: 999 },
]

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
  return new Date().toISOString()
}

// Initialize collaboration types on first read (idempotent seed)
function ensureTypesSeeded() {
  const types = readData('collaboration_types.json', null)
  if (types !== null && types.length > 0) return types
  const seeded = DEFAULT_TYPES.map((t) => ({
    id: uid('ct'),
    name: t.name,
    slug: t.slug,
    sortOrder: t.sortOrder,
    active: true,
  }))
  writeData('collaboration_types.json', seeded)
  return seeded
}

function makeWspolpraceRouter(middleware) {
  const router = express.Router()
  const { requireAuth, requireAdmin } = middleware

  // ─── BRANDS ──────────────────────────────────────────────────────────────────
  router.get('/brands', requireAuth, (_req, res) => {
    res.json(readData('brands.json', []))
  })

  router.post('/brands', requireAdmin, (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Nazwa marki jest wymagana' })
    if (name.length > 120) return res.status(400).json({ error: 'Nazwa marki za długa (max 120)' })

    const brands = readData('brands.json', [])
    if (brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: 'Marka o tej nazwie już istnieje' })
    }
    const brand = { id: uid('br'), name, active: true, createdAt: nowIso() }
    brands.push(brand)
    writeData('brands.json', brands)
    res.json(brand)
  })

  router.put('/brands/:id', requireAdmin, (req, res) => {
    const brands = readData('brands.json', [])
    const idx = brands.findIndex((b) => b.id === req.params.id)
    if (idx < 0) return res.status(404).json({ error: 'Nie znaleziono marki' })

    if (typeof req.body?.name === 'string') {
      const newName = req.body.name.trim()
      if (!newName) return res.status(400).json({ error: 'Nazwa marki nie może być pusta' })
      brands[idx].name = newName
    }
    if (typeof req.body?.active === 'boolean') brands[idx].active = req.body.active
    writeData('brands.json', brands)
    res.json(brands[idx])
  })

  // ─── OUTLETS (any authed user can manage) ────────────────────────────────────
  router.get('/outlets', requireAuth, (_req, res) => {
    res.json(readData('outlets.json', []))
  })

  router.post('/outlets', requireAuth, (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Nazwa redakcji jest wymagana' })
    if (name.length > 160) return res.status(400).json({ error: 'Nazwa za długa (max 160)' })

    const outlets = readData('outlets.json', [])
    if (outlets.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: 'Redakcja o tej nazwie już istnieje' })
    }
    const outlet = {
      id: uid('ol'),
      name,
      active: true,
      createdBy: req.user.username,
      createdAt: nowIso(),
    }
    outlets.push(outlet)
    writeData('outlets.json', outlets)
    res.json(outlet)
  })

  router.put('/outlets/:id', requireAuth, (req, res) => {
    const outlets = readData('outlets.json', [])
    const idx = outlets.findIndex((o) => o.id === req.params.id)
    if (idx < 0) return res.status(404).json({ error: 'Nie znaleziono redakcji' })

    if (typeof req.body?.name === 'string') {
      const newName = req.body.name.trim()
      if (!newName) return res.status(400).json({ error: 'Nazwa nie może być pusta' })
      outlets[idx].name = newName
    }
    if (typeof req.body?.active === 'boolean') outlets[idx].active = req.body.active
    writeData('outlets.json', outlets)
    res.json(outlets[idx])
  })

  // ─── COLLABORATION TYPES (admin only for writes) ─────────────────────────────
  router.get('/types', requireAuth, (_req, res) => {
    res.json(ensureTypesSeeded())
  })

  router.post('/types', requireAdmin, (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    if (!name) return res.status(400).json({ error: 'Nazwa rodzaju jest wymagana' })

    const slug = (req.body?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    const sortOrder = Number(req.body?.sortOrder ?? 500)

    const types = ensureTypesSeeded()
    if (types.some((t) => t.slug === slug)) {
      return res.status(409).json({ error: 'Rodzaj o tym slugu już istnieje' })
    }
    const type = { id: uid('ct'), name, slug, sortOrder, active: true }
    types.push(type)
    writeData('collaboration_types.json', types)
    res.json(type)
  })

  router.put('/types/:id', requireAdmin, (req, res) => {
    const types = ensureTypesSeeded()
    const idx = types.findIndex((t) => t.id === req.params.id)
    if (idx < 0) return res.status(404).json({ error: 'Nie znaleziono rodzaju' })

    if (typeof req.body?.name === 'string') types[idx].name = req.body.name.trim()
    if (typeof req.body?.active === 'boolean') types[idx].active = req.body.active
    if (typeof req.body?.sortOrder === 'number') types[idx].sortOrder = req.body.sortOrder
    writeData('collaboration_types.json', types)
    res.json(types[idx])
  })

  // ─── PRICE LIST ──────────────────────────────────────────────────────────────
  router.get('/price-list', requireAuth, (_req, res) => {
    res.json(readData('price_list.json', []))
  })

  router.post('/price-list', requireAuth, (req, res) => {
    const outletId = String(req.body?.outletId ?? '').trim()
    const collaborationTypeId = String(req.body?.collaborationTypeId ?? '').trim()
    const priceGrosze = Number(req.body?.priceGrosze)
    const priceType = String(req.body?.priceType ?? 'NETTO')
    const note = req.body?.note ? String(req.body.note).slice(0, 1000) : null

    if (!outletId) return res.status(400).json({ error: 'Wybierz redakcję' })
    if (!collaborationTypeId) return res.status(400).json({ error: 'Wybierz rodzaj' })
    if (!Number.isInteger(priceGrosze) || priceGrosze <= 0) {
      return res.status(400).json({ error: 'Cena musi być liczbą całkowitą > 0 (w groszach)' })
    }
    if (!PRICE_TYPES.includes(priceType)) {
      return res.status(400).json({ error: 'Nieprawidłowy typ ceny (NETTO|BRUTTO)' })
    }

    const entries = readData('price_list.json', [])
    const idx = entries.findIndex(
      (e) => e.outletId === outletId && e.collaborationTypeId === collaborationTypeId,
    )
    const now = nowIso()
    if (idx >= 0) {
      entries[idx] = {
        ...entries[idx],
        priceGrosze,
        priceType,
        note,
        updatedAt: now,
        updatedBy: req.user.username,
      }
    } else {
      entries.push({
        id: uid('pl'),
        outletId,
        collaborationTypeId,
        priceGrosze,
        priceType,
        note,
        createdBy: req.user.username,
        createdAt: now,
        updatedAt: now,
      })
    }
    writeData('price_list.json', entries)
    res.json(idx >= 0 ? entries[idx] : entries[entries.length - 1])
  })

  router.delete('/price-list/:id', requireAuth, (req, res) => {
    const entries = readData('price_list.json', [])
    const filtered = entries.filter((e) => e.id !== req.params.id)
    if (filtered.length === entries.length) return res.status(404).json({ error: 'Nie znaleziono wpisu' })
    writeData('price_list.json', filtered)
    res.json({ ok: true })
  })

  // ─── COLLABORATIONS ──────────────────────────────────────────────────────────
  function validateCollabPayload(body) {
    const brandId = String(body?.brandId ?? '').trim()
    const outletId = String(body?.outletId ?? '').trim()
    const collaborationTypeId = String(body?.collaborationTypeId ?? '').trim()
    const priceGrosze = Number(body?.priceGrosze)
    const priceType = String(body?.priceType ?? 'NETTO')
    const status = String(body?.status ?? 'PLANOWANA')
    const plannedDate = body?.plannedDate || null
    const completedDate = body?.completedDate || null
    const link = body?.link ? String(body.link).trim() : null
    const note = body?.note ? String(body.note).slice(0, 2000) : null

    if (!brandId) return { error: 'Wybierz markę' }
    if (!outletId) return { error: 'Wybierz redakcję' }
    if (!collaborationTypeId) return { error: 'Wybierz rodzaj' }
    if (!Number.isInteger(priceGrosze) || priceGrosze <= 0) {
      return { error: 'Cena musi być liczbą całkowitą > 0 (w groszach)' }
    }
    if (!PRICE_TYPES.includes(priceType)) return { error: 'Nieprawidłowy typ ceny' }
    if (!COLLABORATION_STATUSES.includes(status)) return { error: 'Nieprawidłowy status' }
    if (status === 'ZREALIZOWANA' && !completedDate) {
      return { error: 'Zrealizowana współpraca wymaga daty realizacji' }
    }
    if (status !== 'ZREALIZOWANA' && completedDate) {
      return { error: 'Data realizacji tylko dla statusu Zrealizowana' }
    }

    return {
      data: {
        brandId, outletId, collaborationTypeId, priceGrosze, priceType, status,
        plannedDate, completedDate, link, note,
      },
    }
  }

  router.get('/collaborations', requireAuth, (_req, res) => {
    res.json(readData('collaborations.json', []))
  })

  router.post('/collaborations', requireAuth, (req, res) => {
    const v = validateCollabPayload(req.body)
    if (v.error) return res.status(400).json({ error: v.error })

    const collabs = readData('collaborations.json', [])
    const now = nowIso()
    const collab = {
      id: uid('co'),
      ...v.data,
      createdBy: req.user.username,
      createdAt: now,
      updatedAt: now,
    }
    collabs.push(collab)
    writeData('collaborations.json', collabs)
    res.json(collab)
  })

  router.put('/collaborations/:id', requireAuth, (req, res) => {
    const collabs = readData('collaborations.json', [])
    const idx = collabs.findIndex((c) => c.id === req.params.id)
    if (idx < 0) return res.status(404).json({ error: 'Nie znaleziono współpracy' })

    const v = validateCollabPayload(req.body)
    if (v.error) return res.status(400).json({ error: v.error })

    collabs[idx] = {
      ...collabs[idx],
      ...v.data,
      updatedAt: nowIso(),
    }
    writeData('collaborations.json', collabs)
    res.json(collabs[idx])
  })

  return router
}

module.exports = { makeWspolpraceRouter, DEFAULT_TYPES }
