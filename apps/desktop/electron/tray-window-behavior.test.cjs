const assert = require('node:assert/strict')
const test = require('node:test')

const {
  buildTrayMenuTemplate,
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

test('builds a tray menu with explicit open and quit actions', () => {
  const open = () => 'open'
  const quit = () => 'quit'
  const menu = buildTrayMenuTemplate({ open, quit })

  assert.equal(menu[0].label, 'Open Hermes')
  assert.equal(menu[0].click, open)
  assert.equal(menu[1].type, 'separator')
  assert.equal(menu[2].label, 'Quit Hermes')
  assert.equal(menu[2].click, quit)
})
