'use strict'

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

function buildTrayMenuTemplate({ open, quit }) {
  return [
    { label: 'Open Hermes', click: open },
    { type: 'separator' },
    { label: 'Quit Hermes', click: quit }
  ]
}

module.exports = {
  buildTrayMenuTemplate,
  shouldCreateTray,
  shouldHideMainWindowOnClose,
  shouldQuitWhenAllWindowsClosed
}
