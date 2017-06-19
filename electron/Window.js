"use strict";

const {BrowserWindow} = require('electron')
const {once} = require('./Starling/Util')


const close = (window) => window.close()
const open = (options) => new BrowserWindow(options)
const show = (window) => {
  window.show()
  return window
}
const load = (url, window) => {
  window.loadURL(url)
  return window
}

const openDevTools = (window) => {
  window.openDevTools()
  return window
}

const onClose = (window) => once('closed', window)

const onReadyToShow = (window) => once('ready-to-show', window)

const update = (window, event) => {
  const {message} = event
  console.log('Window.update', message)
  switch (message.type) {
    case 'minimize-native-window':
      window.minimize()
      return window
    case 'toggle-fullscreen-native-window':
      window.setFullScreen(!window.isFullScreen())
      return window
    default:
      console.warn('Unsupported message received', message)
      return window
  }
}


module.exports = {
  open,
  close,
  show,
  load,
  openDevTools,
  onClose,
  onReadyToShow,
  update
}