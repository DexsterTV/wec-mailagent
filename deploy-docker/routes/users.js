'use strict'

const express = require('express')
const { readData, writeData } = require('./storage')
const { getUsers } = require('./auth')

function makeUsersRouter(sessions, middleware) {
  const router = express.Router()
  const { requireAdmin } = middleware

  router.get('/', requireAdmin, (req, res) => {
    const users = getUsers().map(({ password: _pw, ...rest }) => rest)
    res.json(users)
  })

  router.post('/', requireAdmin, (req, res) => {
    const { username, displayName, password, role, permissions } = req.body || {}

    if (!username || !displayName || !role) {
      return res.status(400).json({ error: 'Wymagane pola: username, displayName, role' })
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Nieprawidłowa rola — dozwolone: admin, user' })
    }
    if (!/^[a-zA-Z0-9_.-]{2,32}$/.test(username)) {
      return res.status(400).json({ error: 'Nazwa użytkownika: 2–32 znaki, tylko litery, cyfry, _.-' })
    }

    let users = getUsers()
    const idx = users.findIndex(u => u.username === username)

    if (idx >= 0) {
      const updated = { ...users[idx], displayName, role, permissions: permissions || {} }
      if (password) updated.password = password
      users[idx] = updated
      for (const [token, session] of sessions.entries()) {
        if (session.username === username) {
          sessions.set(token, { ...session, displayName, role, permissions: permissions || {} })
        }
      }
    } else {
      if (!password) return res.status(400).json({ error: 'Hasło jest wymagane dla nowego użytkownika' })
      users.push({ username, password, role, displayName, permissions: permissions || {} })
    }

    writeData('users.json', users)
    res.json({ ok: true, username })
  })

  router.delete('/:username', requireAdmin, (req, res) => {
    const { username } = req.params
    if (username === req.user.username) {
      return res.status(400).json({ error: 'Nie możesz usunąć własnego konta' })
    }
    let users = getUsers()
    const toDelete = users.find(u => u.username === username)
    if (!toDelete) return res.status(404).json({ error: 'Użytkownik nie istnieje' })
    if (toDelete.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      return res.status(400).json({ error: 'Nie można usunąć ostatniego administratora' })
    }
    users = users.filter(u => u.username !== username)
    writeData('users.json', users)
    for (const [token, session] of sessions.entries()) {
      if (session.username === username) sessions.delete(token)
    }
    console.log(`[WEC] Usunięto użytkownika: ${username}`)
    res.json({ ok: true })
  })

  return router
}

module.exports = { makeUsersRouter }
