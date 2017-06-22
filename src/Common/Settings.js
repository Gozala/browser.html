/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {error, ok} from '../Common/Result'
import * as Unknown from '../Common/Unknown'
import {merge, always, nofx} from '../Common/Prelude'
import {Effects, Task} from 'reflex'
import * as Runtime from '../Common/Runtime'

import type {Never} from 'reflex'
import type {Result} from './Result'

export type Name = string
export type Value
  = number
  | boolean
  | string
  | null

export type Settings =
  { [key:Name]: Value
  }

export type Model = ?Settings

export type ResultSettings =
  Result<Error, Settings>

export type Action =
  | { type: "Fetched",
     result: ResultSettings
    }
  | { type: "Updated",
     result: ResultSettings
    }
  | { type: "Changed",
     result: ResultSettings
    }

const NotSupported =
  ReferenceError('navigator.mozSettings API is not available')

export const Fetched =
  (result:Result<Error, Settings>):Action =>
  ({ type: 'Fetched',
     result
    }
  )

export const Updated =
  (result:Result<Error, Settings>):Action =>
  ({ type: 'Updated',
     result
    }
  )

export const Changed =
  (result:Result<Error, Settings>):Action =>
  ({ type: 'Changed',
     result
    }
  )

const merges =
  records =>
  (records.length === 1
  ? records[0]
  : records.reduce((result, record) => {
    for (let name in record) {
      if (record.hasOwnProperty(name)) {
        result[name] = record[name]
      }
    }
    return result
  }
    )
  )

export const fetch =
  (names:Array<Name>):Task<Never, Result<Error, Settings>> => {
    if (navigator.mozSettings != null) {
      const mozSettings = navigator.mozSettings
      return new Task((succeed, fail) => {
        const lock = mozSettings.createLock()
        const settings = names.map(name => lock.get(name))
        Promise
          .all(settings)
          .then(merges)
          .then(ok, error)
          .then(succeed, fail)
      })
    } else {
      const task = Runtime
        .request('settings', 'fetched', {
          type:'fetch',
          names
        })
        .map(ok)
      return task
    }
  }

export const change =
  (settings:Settings):Task<Never, Result<Error, Settings>> => {
    if (navigator.mozSettings != null) {
      const {mozSettings} = navigator
      return new Task((succeed, fail) => {
        mozSettings
          .createLock()
          .set(settings)
          .then(always(ok(settings)), error)
          .then(succeed, fail)
      })
    } else {
      console.log('settings-change', settings)
      return Runtime.request('settings', 'changed', {
        type: 'change',
        settings
      }).map(ok)
    }
  }

export const observe =
  (namePattern:string):Task<Never, Result<Error, Settings>> => {
  if (navigator.mozSettings != null) {
    const {mozSettings} = navigator
    return new Task((succeed, fail) => {
      const onChange = change => {
        if (namePattern === '*') {
          mozSettings.removeEventListener('settingchange', onChange)
        } else {
          mozSettings.removeObserver(namePattern, onChange)
        }

        succeed(ok({[change.settingName]: change.settingValue}))
      }

      if (navigator.mozSettings) {
        if (namePattern === '*') {
          mozSettings.addEventListener('settingchange', onChange)
        } else {
          mozSettings.addObserver(namePattern, onChange)
        }
      } else {
        succeed(error(NotSupported))
      }
    })
  } else {
    return Runtime.request('settings', 'changed', {
      type: 'observe',
      name:namePattern
    })
    .map(ok)
  }
}


export const init =
  (names:Array<Name>):[Model, Effects<Action>] =>
  [ null,
   Effects.perform(fetch(names).map(Fetched))
  ]

const updateSettings = (model, settings) =>
  // @TODO: Ignore unknown settings
  [ (model == null
    ? settings
    : merge(model, settings)
    ),
   Effects.batch(Object
      .keys(settings)
      .map(name => Effects.perform(observe(name).map(Updated)))
    )
  ]

const report = (model, error) => {
  console.error('Unhandled error occured ', error)
  return nofx(model)
}

export const update =
  (model:Model, action:Action):[Model, Effects<Action>] => {
  return (action.type === 'Fetched'
    ? (action.result.isOk
      ? updateSettings(model, action.result.value)
      : report(model, action.result.error)
      )
    : action.type === 'Updated'
    ? (action.result.isOk
      ? updateSettings(model, action.result.value)
      : report(model, action.result.error)
      )
    : action.type === 'Changed'
    ? (action.result.isOk
      ? updateSettings(model, action.result.value)
      : report(model, action.result.error)
      )
    : Unknown.update(model, action)
    )
  }