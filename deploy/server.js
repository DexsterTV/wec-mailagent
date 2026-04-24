'use strict'

const express = require('express')
const path    = require('path')

const app  = express()
const PORT = process.env.PORT || 3000

// Shared session store
const sessions = new Map()

const { makeMiddleware }     = require('./routes/middleware')
const { makeAuthRouter, getUsers } = require('./routes/auth')
const { makeUsersRouter }    = require('./routes/users')
const { makeTemplatesRouter } = require('./routes/templates')
const { makeContactsRouter } = require('./routes/contacts')
const { makeLogsRouter }     = require('./routes/logs')
const { makeProwlyRouter }   = require('./routes/prowly')
const { makeSettingsRouter } = require('./routes/settings')

const middleware = makeMiddleware(sessions)

app.use(express.json({ limit: '20mb' }))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      makeAuthRouter(sessions))
app.use('/api/users',     makeUsersRouter(sessions, middleware))
app.use('/api/templates', makeTemplatesRouter(middleware))
app.use('/api/contacts',  makeContactsRouter(middleware))
app.use('/api/logs',      makeLogsRouter(middleware))
app.use('/api/prowly',    makeProwlyRouter(middleware))
app.use('/api/settings',  makeSettingsRouter(middleware))

// ── Static files ──────────────────────────────────────────────────────────────
// Production: serve built React frontend first, then legacy files
const reactDist = path.join(__dirname, 'dist-frontend')
const fs = require('fs')
if (fs.existsSync(reactDist)) {
  app.use(express.static(reactDist))
  app.get('*', (req, res) => res.sendFile(path.join(reactDist, 'index.html')))
} else {
  // Fallback: legacy vanilla SPA
  app.use(express.static(path.join(__dirname)))
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  getUsers() // ensure users.json exists
  console.log(`\n✅ WEC Mailing Agent działa na  http://localhost:${PORT}`)
  console.log(`   Ctrl+C  aby zatrzymać serwer\n`)
})
