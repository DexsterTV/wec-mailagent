'use strict'

const { readData, writeData } = require('./storage')
const { addServerLog } = require('./logs')

function makeSettingsRouter(middleware) {
  const router = require('express').Router()

  // GET /api/settings — any authenticated user (to read prowlyRssUrl)
  router.get('/', middleware.requireAuth, (req, res) => {
    res.json(readData('settings.json', {}))
  })

  // PUT /api/settings — admin only
  router.put('/', middleware.requireAdmin, (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Nieprawidłowe dane' })
    }
    const current = readData('settings.json', {})
    const updated  = { ...current, ...req.body }
    writeData('settings.json', updated)
    const changed = Object.keys(req.body).join(', ')
    console.log(`[WEC] Ustawienia zmienione przez ${req.user.username}: ${changed}`)
    addServerLog(req.user.username, 'SETTINGS_UPDATE', `Zaktualizowano ustawienia: ${changed}`)
    res.json(updated)
  })

  return router
}

module.exports = { makeSettingsRouter }
