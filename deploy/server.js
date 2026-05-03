'use strict'

require('dotenv').config()

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// Shared session store
const sessions = new Map()

const { makeMiddleware } = require('./routes/middleware')
const { makeAuthRouter, getUsers } = require('./routes/auth')
const { makeUsersRouter } = require('./routes/users')
const { makeTemplatesRouter } = require('./routes/templates')
const { makeContactsRouter } = require('./routes/contacts')
const { makeLogsRouter } = require('./routes/logs')
const { makeProwlyRouter } = require('./routes/prowly')
const { makeSettingsRouter } = require('./routes/settings')

const middleware = makeMiddleware(sessions)

app.use(express.json({ limit: '20mb' }))

app.use('/api/auth', makeAuthRouter(sessions))
app.use('/api/users', makeUsersRouter(sessions, middleware))
app.use('/api/templates', makeTemplatesRouter(middleware))
app.use('/api/contacts', makeContactsRouter(middleware))
app.use('/api/logs', makeLogsRouter(middleware))
app.use('/api/prowly', makeProwlyRouter(middleware))
app.use('/api/settings', makeSettingsRouter(middleware))

const reactDist = path.join(__dirname, 'dist-frontend')

if (!fs.existsSync(reactDist)) {
  throw new Error('Missing dist-frontend. Run `npm run build` before starting the server.')
}

app.use(express.static(reactDist))
app.get('*', (_req, res) => res.sendFile(path.join(reactDist, 'index.html')))

app.listen(PORT, () => {
  getUsers() // Ensure users.json exists
  console.log(`\nWEC Mailing Agent is running at http://localhost:${PORT}`)
  console.log('Ctrl+C to stop the server\n')
})
