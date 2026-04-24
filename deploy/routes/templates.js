'use strict'

const express = require('express')
const fs      = require('fs')
const path    = require('path')
const { readData, writeData, DATA_DIR } = require('./storage')

function makeTemplatesRouter(middleware) {
  const router = express.Router()
  const { requireAuth, requirePermission } = middleware

  router.get('/', requireAuth, (req, res) => {
    const filepath = path.join(DATA_DIR, 'templates.json')
    if (!fs.existsSync(filepath)) return res.json(null)
    res.json(readData('templates.json', []))
  })

  router.post('/', requirePermission('canEditTemplates'), (req, res) => {
    const tpl = req.body
    if (!tpl || !tpl.id) return res.status(400).json({ error: 'Brak ID szablonu' })
    let templates = readData('templates.json', [])
    const idx = templates.findIndex(t => t.id === tpl.id)
    if (idx >= 0) templates[idx] = tpl
    else templates.push(tpl)
    writeData('templates.json', templates)
    res.json({ ok: true })
  })

  router.delete('/:id', requirePermission('canEditTemplates'), (req, res) => {
    let templates = readData('templates.json', [])
    templates = templates.filter(t => t.id !== req.params.id)
    writeData('templates.json', templates)
    res.json({ ok: true })
  })

  return router
}

module.exports = { makeTemplatesRouter }
