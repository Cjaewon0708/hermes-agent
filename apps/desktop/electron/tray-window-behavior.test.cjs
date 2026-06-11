const assert = require('node:assert/strict')
const test = require('node:test')

const {
  buildRecentSessionMenuItems,
  buildTrayMenuTemplate,
  currentSessionIdFromUrl,
  sessionContextLabel,
  sessionMenuLabel,
  sessionRouteHash,
  shouldCreateTray,
  shouldHideMainWindowOnClose,
  shouldQuitWhenAllWindowsClosed
} = require('./tray-window-behavior.cjs')

test('creates a tray only on non-mac platforms and only once', () => {
  assert.equal(shouldCreateTray({ isMac: false, existingTray: null }), true)
  assert.equal(shouldCreateTray({ isMac: false, existingTray: {} }), false)
  assert.equal(shouldCreateTray({ isMac: true, existingTray: null }), false)
})

test('hides the main window on close only when a non-mac app is not quitting', () => {
  assert.equal(shouldHideMainWindowOnClose({ isMac: false, isQuitting: false }), true)
  assert.equal(shouldHideMainWindowOnClose({ isMac: false, isQuitting: true }), false)
  assert.equal(shouldHideMainWindowOnClose({ isMac: true, isQuitting: false }), false)
})

test('keeps tray-backed apps alive when every window is closed', () => {
  assert.equal(shouldQuitWhenAllWindowsClosed({ platform: 'win32', hasTray: true }), false)
  assert.equal(shouldQuitWhenAllWindowsClosed({ platform: 'linux', hasTray: true }), false)
  assert.equal(shouldQuitWhenAllWindowsClosed({ platform: 'win32', hasTray: false }), true)
  assert.equal(shouldQuitWhenAllWindowsClosed({ platform: 'darwin', hasTray: false }), false)
})

test('builds a Codex-style tray menu with running, recent, more, new chat, open, and exit actions', () => {
  const calls = []
  const open = () => calls.push('open')
  const openCurrentSession = () => calls.push('current')
  const openNewSession = () => calls.push('new')
  const openSession = id => calls.push(`session:${id}`)
  const quit = () => calls.push('quit')
  const menu = buildTrayMenuTemplate({
    currentSessionId: 's1',
    open,
    openCurrentSession,
    openNewSession,
    openSession,
    quit,
    recentSessions: [
      { id: 's1', title: 'Running chat', cwd: 'C:/Work/Current Project' },
      { id: 's2', title: 'Recent chat', cwd: 'C:/Work/Batch FileName Translator' },
      { id: 's3', title: 'File management', source: 'desktop' },
      { id: 's4', title: 'Add popup-studio-ai/bkit-claude-code', source: 'cli' },
      { id: 's5', title: 'Older chat', cwd: 'C:/Work/Archive' }
    ]
  })

  assert.equal(menu[0].label, 'Running')
  assert.equal(menu[0].enabled, false)
  assert.equal(menu[1].label, 'Running chat\tCurrent Project')
  assert.equal(menu[1].click, openCurrentSession)
  assert.equal(menu[2].type, 'separator')
  assert.equal(menu[3].label, 'Recent')
  assert.equal(menu[3].enabled, false)
  assert.equal(menu[4].label, 'Recent chat\tBatch FileName Translator')
  menu[4].click()
  assert.deepEqual(calls, ['session:s2'])
  assert.equal(menu[5].label, 'File management\tChats')
  assert.equal(menu[6].label, 'Add popup-studio-ai/bkit-claude...\tChats')
  assert.equal(menu[7].label, 'More')
  assert.equal(menu[7].submenu[0].label, 'Older chat\tArchive')
  assert.equal(menu[8].type, 'separator')
  assert.equal(menu[9].label, 'New Chat')
  assert.equal(menu[9].click, openNewSession)
  assert.equal(menu[10].type, 'separator')
  assert.equal(menu[11].label, 'Open Hermes')
  assert.equal(menu[11].click, open)
  assert.equal(menu[12].type, 'separator')
  assert.equal(menu[13].label, 'Exit')
  assert.equal(menu[13].click, quit)
})

test('shows disabled placeholders when no current or recent chat is available', () => {
  const menu = buildTrayMenuTemplate({
    currentSessionId: '',
    open: () => {},
    openCurrentSession: () => {},
    openNewSession: () => {},
    openSession: () => {},
    quit: () => {}
  })

  assert.equal(menu[0].label, 'Running')
  assert.equal(menu[1].label, 'No running chat')
  assert.equal(menu[1].enabled, false)
  assert.equal(menu[3].label, 'Recent')
  assert.equal(menu[4].label, 'No recent chats')
  assert.equal(menu[4].enabled, false)
})

test('extracts the active route session id from desktop URLs', () => {
  assert.equal(currentSessionIdFromUrl('file:///app/index.html#/abc123'), 'abc123')
  assert.equal(currentSessionIdFromUrl('http://localhost:5174/#/a%20b%2Fc'), 'a b/c')
  assert.equal(currentSessionIdFromUrl('file:///app/index.html#/'), '')
  assert.equal(currentSessionIdFromUrl('file:///app/index.html#/settings'), '')
  assert.equal(currentSessionIdFromUrl('not a url'), '')
})

test('builds hash routes for session ids', () => {
  assert.equal(sessionRouteHash('a b/c'), '#/a%20b%2Fc')
  assert.equal(sessionRouteHash(''), '#/')
})

test('limits and labels recent session tray items with a More submenu', () => {
  const opened = []
  const items = buildRecentSessionMenuItems({
    limit: 4,
    visibleLimit: 2,
    openSession: id => opened.push(id),
    recentSessions: [
      { id: '1', title: 'First', cwd: 'C:/Work/Folder' },
      { id: '2', title: '', source: 'desktop' },
      { id: '3', title: 'Third', cwd: 'C:/Work/Third Project' },
      { id: '4', title: 'Fourth', cwd: 'C:/Work/Fourth' },
      { id: '5', title: 'Fifth', cwd: 'C:/Work/Fifth' }
    ]
  })

  assert.equal(items.length, 3)
  assert.equal(items[0].label, 'First\tFolder')
  assert.equal(items[1].label, 'Untitled chat\tChats')
  assert.equal(items[2].label, 'More')
  assert.equal(items[2].submenu.length, 2)
  assert.equal(items[2].submenu[0].label, 'Third\tThird Project')
  items[2].submenu[0].click()
  assert.deepEqual(opened, ['3'])
})

test('formats session menu labels with right-side context text', () => {
  assert.equal(sessionContextLabel({ cwd: 'C:/Work/Batch FileName Translator' }), 'Batch FileName Translator')
  assert.equal(sessionContextLabel({ source: 'telegram' }), 'Chats')
  assert.equal(sessionContextLabel({ source: 'cron' }), 'Cron')
  assert.equal(sessionMenuLabel({ title: '네이버 메일 접근 확인', source: 'desktop' }), '네이버 메일 접근 확인\tChats')
})
