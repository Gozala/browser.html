"use strict";

const {pipe} = require('./Util')
const {ReadableStream, WritableStream} = require('whatwg-streams-b')

class Task {
  static spawn(task) {
    return new this(task).spawn()
  }
  constructor(task) {
    this.task = task
    const inner = {}


    const receiver = pipe()
    this.readable = receiver.readable
    inner.writable = receiver.writable

    const sender = pipe()
    this.writable = sender.writable
    inner.readable = sender.readable

    const cancel = new Promise((resolve, reject) => {
      this.cancel = resolve
      this.error = reject
    })

    this.run = async () => {
      try {
        const task = this.task(inner)
        await Promise.race([task, cancel])
        await sender.close()
        await receiver.close()
      } catch (error) {
        await sender.error(error)
        await receiver.error(error)
      }
    }
  }
  exit(reason) {
    if (reason == null) {
      this.cancel()
    } else {
      this.error(reason)
    }
  }
  spawn() {
    this.run()
    return this
  }
}


module.exports = Task