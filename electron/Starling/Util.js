"use strict"

const {ReadableStream, WritableStream} = require('whatwg-streams-b')

class Sync {
  constructor(pipe) {
    this.pipe = pipe
  }
  start(controller) {
    this.pipe.sync = controller
  }
  write(chunk, controller) {
    return this.pipe.source.enqueue(chunk)
  }
  close() {
    return this.pipe.source.close()
  }
  abort(reason) {
    return this.pipe.source.error(reason)
  }
}

class Source {
  constructor(pipe) {
    this.pipe = pipe
  }
  start(controller) {
    this.pipe.source = controller
  }
  pull(controller) {
  }
  cancel(reason) {
    if (reason == null) {
      return this.pipe.sync.close()
    } else {
      return this.pipe.sync.error(reason)
    }
  }
}

class Pipe {
  constructor() {
    this.readable = new ReadableStream(new Source(this))
    this.writable = new WritableStream(new Sync(this))
  }
  close() {
    this.source.close()
  }
  error(reason) {
    this.source.error(reason)
    this.sync.error(reason)
  }
}


const pipe = () => new Pipe()

const once = (type, target) =>
  new Promise(resolve => target.once(type, resolve))

const on = (type, target) => {
  const {readable, writable} = pipe()
  const writer = writable.getWriter()
  const listener = (event, message) => {
    console.log('<<<', type, event.sender.id, message)
    event.type = type
    event.message = message
    writer.write(event)
  }
  const close = () => target.removeListener(type, listener)

  target.on(type, listener)
  writer.closed.then(close, close)
  
  return readable
}

const send = (message, type, event) => {
  event.sender.send(`${event.type}/${type}`, message)
  console.log('>>>', `${event.type}/${type}`, message)
}


module.exports = {
  pipe,
  on,
  once,
  send
}