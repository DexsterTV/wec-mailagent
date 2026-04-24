'use strict'

// sessions is passed in to avoid circular deps — server owns the Map
function makeMiddleware(sessions) {
  function requireAuth(req, res, next) {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Brak autoryzacji' })
    }
    const token   = header.slice(7)
    const session = sessions.get(token)
    if (!session) {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token — zaloguj się ponownie' })
    }
    req.user = session
    next()
  }

  function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Brak uprawnień administratora' })
      }
      next()
    })
  }

  function requirePermission(permKey) {
    return (req, res, next) => {
      requireAuth(req, res, () => {
        if (req.user.role === 'admin') return next()
        const perms = req.user.permissions || {}
        if (perms[permKey] !== false) return next()
        return res.status(403).json({ error: 'Brak uprawnień do tej operacji' })
      })
    }
  }

  return { requireAuth, requireAdmin, requirePermission }
}

module.exports = { makeMiddleware }
