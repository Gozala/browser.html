const {app, nativeImage} = require('electron')
const {once} = require('./Starling/Util')

const onReady = () => once('ready', app)
const onAllWindowsClosed = () => once('window-all-closed', app)

const quit = () => app.quit()

const setIconPath = (path) =>
  app.dock.setIcon(nativeImage.createFromPath(path))

module.exports = {
  onReady,
  onAllWindowsClosed,
  quit,
  setIconPath
}