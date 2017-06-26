/* @flow */

import {Effects, html} from 'reflex'
import {nofx} from '../Common/Prelude'
import * as Runtime from '../Common/Runtime'
import * as Unknown from '../Common/Unknown'

import type {Address, DOM} from 'reflex'

export type Model <model, action> = // eslint-disable-line no-unused-vars
  { mode: 'raw' | 'json' | 'none'
  }

export type Action <model, action> = // eslint-disable-line no-unused-vars
  | { type: "NoOp" }
  | { type: "Debuggee", debuggee: action }

type Step <model, action> =
  [ Model<model, action>,
   Effects<Action<model, action>>
  ]

export const init = <model, action, flags> // eslint-disable-line no-unused-vars
  ():Step<model, action> =>
  ([ { mode:
        (Runtime.env.log === 'json'
        ? 'json'
        : Runtime.env.log != null
        ? 'raw'
        : 'none'
        )
      },
     Effects.none
    ]
  )

export const update = <state, message>
  (model:Model<state, message>,
   action:Action<state, message>
  ):Step<state, message> =>
  (action.type === 'NoOp'
  ? nofx(model)
  : action.type === 'Debuggee'
  ? log(model, action.debuggee)
  : Unknown.update(model, action)
  )

const log = <state, message>
  (model:Model<state, message>,
   action:message
  ):Step<state, message> => {
  (model.mode === 'raw'
    ? console.log('Action >>', action)
    : model.mode === 'json'
    ? console.log(`Action >> ${JSON.stringify(action)}`)
    : null
    )

  return nofx(model)
}

export const view = <state, message>
  (model:Model<state, message>,
   address:Address<Action<state, message>>
  ):DOM =>
  html.noscript()
