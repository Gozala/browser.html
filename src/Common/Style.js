/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type {StyleDictionary} from "reflex"

export type Selector = string

export type Rules = StyleDictionary

export type Sheet =
  {[selector:string]: ?StyleDictionary}

const composedStyles = Object.create(null)


const ID = Symbol('style-sheet/id')
var id = 0

export const StyleSheet = {
  create <sheet: Sheet> (input:sheet):sheet {
    const result:sheet = ({}:any)
    for (var selector in input) {
      if (input.hasOwnProperty(selector)) {
        const style = input[selector]
        if (typeof (style) === 'object' && style != null) {
          void ((style:Object)[ID] = ++id)
          result[selector] = style
        } else {
          result[selector] = style
        }
      }
    }

    return result
  }
}

// Mix multiple style objects together. Will memoize the combination of styles
// to minimize object creation. Returns style object that is the result of
// mixing styles together.
export function mix (...styles:Array<?Rules>):Rules {
  var length = styles.length
  var index = 0
  var id:?string = null
  while (index < length) {
    const style = styles[index]
    if (style) {
      if ((style:Object)[ID]) {
        id = id ? `${String(id)}+${String((style:Object)[ID])}` : String((style:Object)[ID])
      } else if (typeof (style) === 'object') {
        id = null
      } else {
        throw TypeError('Style may only be given objects and falsy values')
      }
      index = index + 1
    } else {
      styles.splice(index, 1)
      length = length - 1
    }
  }

  const composedStyle:?Rules =
    (id != null
    ? composedStyles[id]
    : null
    )

  if (composedStyle != null) {
    return composedStyle
  } else if (id != null) {
    const composedStyle = Object.assign({}, ...styles)
    void ((composedStyle:Object)[ID] = id)
    composedStyles[id] = composedStyle
    return composedStyle
  } else {
    const composedStyle = Object.assign({}, ...styles)
    void ((composedStyle:Object)[ID] = null)
    return composedStyle
  }
}

export const Style = mix

export const createSheet = StyleSheet.create
