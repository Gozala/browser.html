/* @noflow */
"use strict";

const {ipcMain} = require('electron')
const Path = require('path')
const Settings = require('./Settings')
const App = require('./App')
const Window = require('./Window')
const {on} = require('./Starling/Util')
const Task = require('./Starling/Task')

const exit = async (state) => {
  await Window.close(state.window)
  await state.settings.exit()
  await App.quit()
}

const update = async (state, event) => {
  console.log('Main.update', state, event.type, event.message.type)
  switch (event.message.type) {
    case 'shutdown-application':
      return await exit(state)
    case 'minimize-native-window':
    case 'toggle-fullscreen-native-window':
      state.window = await Window.update(state.window, event)
      return state
    case 'default':
      console.warn('Received unknown message', event.message)
      return state
  }
}

const main = async (...args) => {
  if (args.includes('--trace-warnings')) {
    process.on('unhandledRejection', error => console.warn(error))
  }

  const query = encodeArgsAsQueryString(args.slice(2))
  const file = Path.resolve(module.filename, '../../dist/index.html')
  const url = `file://${file}?${query}`
  const preloadURL = Path.resolve(Path.join('.'), 'electron/Preload.js')
  
  let state = {
    file,
    query,
    url,
    settings:null,
    window:null
  }


  await App.onReady()
  await App.setIconPath('./images/icon.png')

  // state.settings = await Settings.init()

  state.window = await Window.open({
    width: 1024,
    height: 740,
    frame: false,
    show: false,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      partition: 'persist:main',
      preload: preloadURL
    }
  })

  if (args.includes('--devtools')) {
    state.window = await Window.openDevTools(state.window)
  }

  state.window = await Window.load(state.url, state.window)
  await Window.onReadyToShow(state.window)
  state.window = await Window.show(state.window)

  const onAllWindowsClosed = App.onAllWindowsClosed()
  
  const appInbox = on('application', ipcMain).getReader()
  const windowInbox = on('window', ipcMain).getReader()
  
  // Settings service
  const settings = Task.spawn(Settings.main)
  on('settings', ipcMain).pipeTo(settings.writable)
  state.settings = settings

  void (async () => {
    while (true) {
      const {done, value} = await windowInbox.read()
      if (done) {
        console.log('done!!!')
        return
      } else {
        state = await update(state, value)
      }
    }
  })()
  void (async () => {
    while (true) {
      const {done, value} = await appInbox.read()
      if (done) {
        console.log('done!!!')
        return
      } else {
        state = await update(state, value)
      }
    }
  })()


  await onAllWindowsClosed
  await exit(state)
}

const encodeArgsAsQueryString =
  args =>
  args.reduce(({flag, query}, arg) =>
    (/^--\w+$/.test(arg) // If new flag swap flag.
    ? { flag: arg.substr(2),
       query:
        (query === ''
        ? `${arg.substr(2)}`
        : `${query}&${arg.substr(2)}`
        )
      }
    : flag == null  // If there is no flag then skip.
    ? {
      flag,
      query
    }
    : { flag,
        query: (
          (query.endsWith(`&${flag}`) || query === flag)
          ? `${query}=${encodeURIComponent(arg)}`
          : `${query}&${flag}=${encodeURIComponent(arg)}`
        )
      }
    ),
    {
      flag: null,
      query: ''
    }
  )
  .query

main(...process.argv)