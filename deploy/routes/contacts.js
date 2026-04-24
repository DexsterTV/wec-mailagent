'use strict'

const express = require('express')
const { readData, writeData } = require('./storage')

function makeContactsRouter(middleware) {
  const router = express.Router()
  const { requireAuth, requirePermission } = middleware

  router.get('/', requireAuth, (req, res) => {
    res.json(readData('contacts.json', []))
  })

  router.post('/', requirePermission('canManageContacts'), (req, res) => {
    const contact = req.body
    if (!contact) return res.status(400).json({ error: 'Brak danych kontaktu' })
    let contacts = readData('contacts.json', [])
    if (!contact.id) contact.id = Date.now().toString()
    const idx = contacts.findIndex(c => c.id === contact.id)
    if (idx >= 0) contacts[idx] = contact
    else contacts.push(contact)
    writeData('contacts.json', contacts)
    res.json(contact)
  })

  router.delete('/:id', requirePermission('canManageContacts'), (req, res) => {
    let contacts = readData('contacts.json', [])
    contacts = contacts.filter(c => c.id !== req.params.id)
    writeData('contacts.json', contacts)
    res.json({ ok: true })
  })

  return router
}

module.exports = { makeContactsRouter }
