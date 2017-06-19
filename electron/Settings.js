const Path = require('path')
const OS = require('os')
const {readFile, writeFile} = require('./FileSystem')
const {send} = require('./Starling/Util')
const defaultSettings = require('../settings.json')

const userSettingsPath = Path.join(OS.homedir(), '.browser.html.json')

const fetch = (state, names, mailbox) => {
  let settings


  if (!names.includes('*')) {
    settings = {}
    for (let name of names) {
      settings[name] = state.settings[name]
    }
  } else {
    settings = state.settings
  }

  
  send(settings, 'fetched', mailbox)

  return state
}

const put = async (state, settings, mailbox) => {
  for (let [name, value] of Object.entries(settings)) {
    console.log(`update setting ${name} = ${value}`)
    if (state.settings[name] != value) {
      state.settings[name] = value
    } else {
      delete settings[name]
    }
  }

  console.log(`== updates settings: ${JSON.stringify(state.settings)}`)

  await send(settings, 'changed', mailbox)

  const observers =
    [...Object.keys(settings), '*'].map(name => state.observers.get(name, null))

  for (let senders of observers) {
    if (senders) {
      for (let mailbox of senders.splice(0)) {
        if (!mailbox.sender.isDestroyed()) {
          void send(settings, 'changed', mailbox)
        }
      }
    }
  }

  return state
}

const observe = (state, name, mailbox) => {
  const observers = state.observers.get(name)
  if (observers) {
    if (!observers.includes(mailbox)) {
      observers.push(mailbox)
    }
  } else {
    state.observers.set(name, [mailbox])
  }

  return state
}

const init = async () => {
  const observers = new Map()
  const settings = Object.assign({}, defaultSettings)
  try {
    const buffer = await readFile(userSettingsPath)
    Object.assign(settings, JSON.parse(buffer.toString()))
  } catch (error) {
    console.warn(`Could not read user settings: ${error}`)
  }

  return {settings, observers}
}

const exit = async (state) => {
  await writeFile(userSettingsPath, JSON.stringify(state.settings, null, 2))
  return state
}

const update = async (state, event) => {
  console.log('Settings.update', event.message)
  const {message} = event
  switch (message.type) {
    case 'fetch':
      return await fetch(state, message.names, event)
    case 'change':
      return await put(state, message.settings, event)
    case 'observe':
      return observe(state, message.name, event)
  }
}

const main = async ({readable, writable}) => {
  let state = await init()
  const reader = readable.getReader()
  while (true) {
    const {done, value} = await reader.read()
    if (done) {
      return exit(state)
    } else if (value) {
      state = await update(state, value)
    }
  }
}


module.exports = {
  init, exit, update, observe, fetch, main
}