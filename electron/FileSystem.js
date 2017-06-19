"use strict";

const FS = require('fs')


const readFile = async (path) => new Promise((resolve, reject) => {
  FS.readFile(path, (error, buffer) => {
    if (error) {
      reject(error)
    } else {
      resolve(buffer)
    }
  })
})

const writeFile = async (path, data) => new Promise((resolve, reject) => {
  FS.writeFile(path, data, (error) => {
    if (error) {
      reject(error)
    } else {
      resolve()
    }
  })
})


module.exports = {
  readFile,
  writeFile
}