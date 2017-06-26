/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Effects, Task} from 'reflex'

export const warn = <action>
  (...params:Array<any>):Task<empty, action> =>
  new Task((succeed, fail) => {
    console.warn(...params)
  })

export const log = <action>
  (...params:Array<any>):Task<empty, action> =>
  new Task((succeed, fail) => {
    console.log(...params)
  })

export const error = <action>
  (...params:Array<any>):Task<empty, action> =>
  new Task((succeed, fail) => {
    console.error(...params)
  })

export const update = <state, message>
  (model:state, action:message):[state, Effects<message>] => {
  console.warn('Unknown action was passed & ignored: ', action, Error().stack)
  return [model, Effects.none]
}
