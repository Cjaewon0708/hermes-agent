'use strict'

const DEFAULT_RECENT_SESSION_LIMIT = 5
const DEFAULT_VISIBLE_RECENT_LIMIT = 3
const MAX_TITLE_LENGTH = 34
const MAX_CONTEXT_LENGTH = 28
const RESERVED_ROUTES = new Set(['settings', 'command-center', 'skills', 'messaging', 'artifacts', 'cron', 'profiles', 'agents'])

function shouldCreateTray({ isMac, existingTray }) {
  return !isMac && !existingTray
}

function shouldHideMainWindowOnClose({ isMac, isQuitting }) {
  return !isMac && !isQuitting
}

function shouldQuitWhenAllWindowsClosed({ platform, hasTray }) {
  if (platform === 'darwin') return false
  return !hasTray
}

function truncateMenuText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ')
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function normalizeSessionTitle(session) {
  const title = String(session?.title || session?.name || session?.preview || '').trim()
  return title || 'Untitled chat'
}

function cwdBasename(cwd) {
  const normalized = String(cwd || '').trim().replace(/[\\/]+$/, '')
  if (!normalized) return ''
  return normalized.split(/[\\/]/).pop() || ''
}

function sessionContextLabel(session) {
  const folder = cwdBasename(session?.cwd)
  if (folder) return folder

  const source = String(session?.source || '').trim().toLowerCase()
  if (!source || ['cli', 'desktop', 'gateway', 'slack', 'telegram', 'tui'].includes(source)) {
    return 'Chats'
  }
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function sessionMenuLabel(session, fallbackTitle = 'Untitled chat') {
  const title = truncateMenuText(normalizeSessionTitle(session) || fallbackTitle, MAX_TITLE_LENGTH)
  const context = truncateMenuText(sessionContextLabel(session), MAX_CONTEXT_LENGTH)
  return context ? `${title}\t${context}` : title
}

function sessionRouteHash(sessionId) {
  const id = String(sessionId || '').trim()
  return id ? `#/${encodeURIComponent(id)}` : '#/'
}

function currentSessionIdFromUrl(rawUrl) {
  if (!rawUrl) return ''

  try {
    const url = new URL(String(rawUrl))
    const hash = url.hash || ''
    if (!hash.startsWith('#/')) return ''

    const id = hash.slice(2).split(/[?#]/, 1)[0]
    if (!id || RESERVED_ROUTES.has(id)) return ''
    return decodeURIComponent(id)
  } catch {
    return ''
  }
}

function validRecentSessions(recentSessions = []) {
  return recentSessions.filter(session => session && typeof session.id === 'string' && session.id.trim())
}

function buildSessionMenuItem(session, openSession) {
  return {
    label: sessionMenuLabel(session),
    click: () => openSession(session.id)
  }
}

function buildRecentSessionMenuItems({
  recentSessions = [],
  openSession,
  limit = DEFAULT_RECENT_SESSION_LIMIT,
  visibleLimit = DEFAULT_VISIBLE_RECENT_LIMIT
}) {
  const sessions = validRecentSessions(recentSessions).slice(0, limit)
  if (!sessions.length) return [{ label: 'No recent chats', enabled: false }]

  const visible = sessions.slice(0, visibleLimit).map(session => buildSessionMenuItem(session, openSession))
  const overflow = sessions.slice(visibleLimit).map(session => buildSessionMenuItem(session, openSession))
  if (overflow.length) {
    visible.push({ label: 'More', submenu: overflow })
  }
  return visible
}

function buildRunningSessionItems({ currentSessionId = '', openCurrentSession, recentSessions = [] }) {
  if (!currentSessionId) return [{ label: 'No running chat', enabled: false }]

  const currentSession = validRecentSessions(recentSessions).find(session => session.id === currentSessionId) || {
    id: currentSessionId,
    title: 'Current chat'
  }
  return [{ label: sessionMenuLabel(currentSession, 'Current chat'), click: openCurrentSession }]
}

function buildTrayMenuTemplate({ currentSessionId = '', open, openCurrentSession, openNewSession, openSession, quit, recentSessions = [] }) {
  const filteredRecentSessions = validRecentSessions(recentSessions).filter(session => session.id !== currentSessionId)

  return [
    { label: 'Running', enabled: false },
    ...buildRunningSessionItems({ currentSessionId, openCurrentSession, recentSessions }),
    { type: 'separator' },
    { label: 'Recent', enabled: false },
    ...buildRecentSessionMenuItems({ recentSessions: filteredRecentSessions, openSession }),
    { type: 'separator' },
    { label: 'New Chat', click: openNewSession },
    { type: 'separator' },
    { label: 'Open Hermes', click: open },
    { type: 'separator' },
    { label: 'Exit', click: quit }
  ]
}

module.exports = {
  buildRecentSessionMenuItems,
  buildTrayMenuTemplate,
  currentSessionIdFromUrl,
  sessionContextLabel,
  sessionMenuLabel,
  sessionRouteHash,
  shouldCreateTray,
  shouldHideMainWindowOnClose,
  shouldQuitWhenAllWindowsClosed
}
