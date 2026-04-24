'use strict'

const express = require('express')
const crypto  = require('crypto')
const { readData, writeData } = require('./storage')
const { addServerLog } = require('./logs')

// ── User model migration ──────────────────────────────────────────────────────

function migrateUsers(users) {
  let changed = false
  const migrated = users.map(u => {
    const next = { ...u }
    if (!('email' in next))         { next.email = null;            changed = true }
    if (!('authProviders' in next)) { next.authProviders = ['password']; changed = true }
    if (!('googleId' in next))      { next.googleId = null;         changed = true }
    if (!('picture' in next))       { next.picture = null;          changed = true }
    if (!('permissions' in next))   { next.permissions = {};        changed = true }
    return next
  })
  return { users: migrated, changed }
}

function getUsers() {
  const raw = readData('users.json', null)
  if (raw !== null) {
    const { users: migrated, changed } = migrateUsers(raw)
    if (changed) writeData('users.json', migrated)
    return migrated
  }
  const defaultUsers = [{
    username:      'admin',
    email:         null,
    password:      'admin',
    role:          'admin',
    displayName:   'Administrator',
    permissions:   {},
    authProviders: ['password'],
    googleId:      null,
    picture:       null,
  }]
  writeData('users.json', defaultUsers)
  console.log('[WEC] Utworzono domyślnego użytkownika: admin / admin')
  return defaultUsers
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSession(user) {
  return {
    username:    user.username,
    role:        user.role,
    displayName: user.displayName,
    permissions: user.permissions || {},
    email:       user.email   || null,
    picture:     user.picture || null,
  }
}

function safeUserResponse(user) {
  const { password: _pw, googleId: _gid, ...rest } = user
  return rest
}

function getOAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackUrl  = process.env.GOOGLE_CALLBACK_URL
  if (!clientId || !clientSecret || !callbackUrl) return null
  const { OAuth2Client } = require('google-auth-library')
  return new OAuth2Client(clientId, clientSecret, callbackUrl)
}

// ── Router ────────────────────────────────────────────────────────────────────

function makeAuthRouter(sessions) {
  const router = express.Router()
  const { requireAuth } = require('./middleware').makeMiddleware(sessions)

  // POST /api/auth/login — username or email + password
  router.post('/login', (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'Podaj nazwę użytkownika i hasło' })
    }
    const users     = getUsers()
    const loginNorm = username.trim().toLowerCase()
    const user      = users.find(u =>
      u.username === username ||
      (u.email && u.email.trim().toLowerCase() === loginNorm)
    )
    if (!user || user.password !== password) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      console.warn(`[WEC] Nieudane logowanie: ${username} z ${ip}`)
      addServerLog(username, 'LOGIN_FAIL', `Nieudana próba logowania z ${ip}`)
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' })
    }
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, buildSession(user))
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    console.log(`[WEC] Zalogowano: ${user.username} (${user.role}) z ${ip}`)
    addServerLog(user.username, 'LOGIN', `Zalogowano jako ${user.username} (${user.role}) z ${ip}`)
    res.json({
      token,
      username:    user.username,
      role:        user.role,
      displayName: user.displayName,
      permissions: user.permissions || {},
      email:       user.email   || null,
      picture:     user.picture || null,
    })
  })

  // POST /api/auth/logout
  router.post('/logout', requireAuth, (req, res) => {
    const token = req.headers.authorization.slice(7)
    sessions.delete(token)
    console.log(`[WEC] Wylogowano: ${req.user.username}`)
    addServerLog(req.user.username, 'LOGOUT', `Wylogowano użytkownika ${req.user.username}`)
    res.json({ ok: true })
  })

  // GET /api/auth/me
  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user)
  })

  // GET /api/auth/google — initiate OAuth flow
  router.get('/google', (req, res) => {
    const client = getOAuthClient()
    if (!client) {
      return res.status(503).json({ error: 'Google OAuth nie jest skonfigurowane' })
    }
    const url = client.generateAuthUrl({
      access_type: 'online',
      scope:       ['email', 'profile'],
      prompt:      'select_account',
    })
    res.redirect(url)
  })

  // GET /api/auth/callback/google — OAuth callback from Google
  router.get('/callback/google', async (req, res) => {
    const appUrl = process.env.APP_URL || ''
    const errorRedirect = (msg) =>
      res.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`)

    const client = getOAuthClient()
    if (!client) return errorRedirect('Google OAuth nie jest skonfigurowane')

    const { code } = req.query
    if (!code) return errorRedirect('Brak kodu autoryzacji od Google')

    try {
      const { tokens } = await client.getToken(String(code))
      client.setCredentials(tokens)

      const ticket = await client.verifyIdToken({
        idToken:  tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()

      if (!payload.email || !payload.email_verified) {
        return errorRedirect('Konto Google nie posiada zweryfikowanego adresu e-mail')
      }

      const googleEmail = payload.email.trim().toLowerCase()
      const googleId    = payload.sub
      const picture     = payload.picture || null
      const googleName  = payload.name    || null

      const users = getUsers()
      const idx   = users.findIndex(
        u => u.email && u.email.trim().toLowerCase() === googleEmail
      )

      if (idx < 0) {
        return errorRedirect(
          'Konto Google nie jest przypisane do żadnego użytkownika w systemie. Skontaktuj się z administratorem.'
        )
      }

      // Update user record — never overwrite role, permissions, username, password
      const user = { ...users[idx] }
      user.googleId = googleId
      if (!user.authProviders) user.authProviders = ['password']
      if (!user.authProviders.includes('google')) {
        user.authProviders = [...user.authProviders, 'google']
      }
      if (picture && !user.picture) user.picture = picture
      if (!user.displayName && googleName) user.displayName = googleName
      users[idx] = user
      writeData('users.json', users)

      // Sync active sessions for this user
      for (const [tok, session] of sessions.entries()) {
        if (session.username === user.username) {
          sessions.set(tok, buildSession(user))
        }
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      addServerLog(user.username, 'LOGIN', `Zalogowano przez Google jako ${user.username} z ${ip}`)

      const newToken = crypto.randomBytes(32).toString('hex')
      sessions.set(newToken, buildSession(user))

      res.redirect(`${appUrl}/auth/google/callback?token=${newToken}`)
    } catch (err) {
      console.error('[WEC] Google OAuth błąd:', err.message)
      return errorRedirect('Błąd autoryzacji Google. Spróbuj ponownie.')
    }
  })

  return router
}

module.exports = { makeAuthRouter, getUsers }
