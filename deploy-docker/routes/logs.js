'use strict'

const express = require('express')
const { readData, writeData } = require('./storage')

const MAX_LOG_ENTRIES = 2000

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Used by backend routes to write logs directly (no HTTP round-trip)
function addServerLog(user, action, details) {
  try {
    let logs = readData('logs.json', [])
    logs.push({ id: genId(), timestamp: new Date().toISOString(), user: user || 'system', action, details: details || '' })
    if (logs.length > MAX_LOG_ENTRIES) logs = logs.slice(logs.length - MAX_LOG_ENTRIES)
    writeData('logs.json', logs)
  } catch (e) {
    console.error('[WEC] Błąd zapisu logu:', e.message)
  }
}

function makeLogsRouter(middleware) {
  const router = express.Router()
  const { requireAuth, requireAdmin } = middleware

  router.get('/', requireAdmin, (req, res) => {
    res.json(readData('logs.json', []))
  })

  router.post('/', requireAuth, (req, res) => {
    const entry = req.body
    if (!entry) return res.status(400).json({ error: 'Brak wpisu logu' })
    let logs = readData('logs.json', [])
    logs.push({ id: genId(), ...entry })
    if (logs.length > MAX_LOG_ENTRIES) logs = logs.slice(logs.length - MAX_LOG_ENTRIES)
    writeData('logs.json', logs)
    res.json({ ok: true })
  })

  router.delete('/', requireAdmin, (req, res) => {
    writeData('logs.json', [])
    res.json({ ok: true })
  })

  router.get('/csv', requireAdmin, (req, res) => {
    const logs   = readData('logs.json', [])
    const header = 'Timestamp,User,Action,Details'
    const rows   = logs.map(e => {
      const ts = e.timestamp || ''
      const u  = `"${(e.user    || '').replace(/"/g, '""')}"`
      const a  = `"${(e.action  || '').replace(/"/g, '""')}"`
      const d  = `"${(e.details || '').replace(/"/g, '""')}"`
      return `${ts},${u},${a},${d}`
    })
    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="wec-logi-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  })

  return router
}

module.exports = { makeLogsRouter, addServerLog }
