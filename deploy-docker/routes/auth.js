'use strict'

const express = require('express')
const crypto  = require('crypto')
const { readData, writeData } = require('./storage')
const { addServerLog } = require('./logs')

function getUsers() {
  const users = readData('users.json', null)
  if (users !== null) return users
  const defaultUsers = [{
    username:    'admin',
    password:    'admin',
    role:        'admin',
    displayName: 'Administrator',
    permissions: {},
  }]
  writeData('users.json', defaultUsers)
  console.log('[WEC] Utworzono domyślnego użytkownika: admin / admin')
  return defaultUsers
}

function makeAuthRouter(sessions) {
  const router = express.Router()
  const { requireAuth } = require('./middleware').makeMiddleware(sessions)

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Podaj nazwę użytkownika i hasło' })
    }
    const users = getUsers()
    const user  = users.find(u => u.username === username && u.password === password)
    if (!user) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      console.warn(`[WEC] Nieudane logowanie: ${username} z ${ip}`)
      addServerLog(username, 'LOGIN_FAIL', `Nieudana próba logowania z ${ip}`)
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' })
    }
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, {
      username:    user.username,
      role:        user.role,
      displayName: user.displayName,
      permissions: user.permissions || {},
    })
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    console.log(`[WEC] Zalogowano: ${user.username} (${user.role}) z ${ip}`)
    addServerLog(user.username, 'LOGIN', `Zalogowano jako ${user.username} (${user.role}) z ${ip}`)
    res.json({ token, username: user.username, role: user.role, displayName: user.displayName, permissions: user.permissions || {} })
  })

  router.post('/logout', requireAuth, (req, res) => {
    const token = req.headers.authorization.slice(7)
    sessions.delete(token)
    console.log(`[WEC] Wylogowano: ${req.user.username}`)
    addServerLog(req.user.username, 'LOGOUT', `Wylogowano użytkownika ${req.user.username}`)
    res.json({ ok: true })
  })

  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user)
  })

  return router
}

module.exports = { makeAuthRouter, getUsers }
