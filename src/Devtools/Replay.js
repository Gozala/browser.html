/* @flow */

import {Effects, Task, html, thunk} from 'reflex'
import {merge, nofx} from '../Common/Prelude'
import {ok, error} from '../Common/Result'
import * as Runtime from '../Common/Runtime'
import * as Unknown from '../Common/Unknown'
import * as Style from '../Common/Style'

import type {Address, DOM} from 'reflex'
import type {Result} from '../Common/Result'

export type Model <model, action> = // eslint-disable-line no-unused-vars
  { snapshotURI: string,
   error: ?Error,
   replayed: boolean
  }

export type Action <model, action> =
  | { type: "Load" }
  | { type: "Snapshot", result: Result<Error, model> }
  | { type: "Replay", replay: model }
  | { type: "Debuggee", debuggee: action }

type Step <model, action> =
  [ Model<model, action>,
   Effects<Action<model, action>>
  ]

const Load = { type: 'Load' }

const Snapshot = <model, action>
  (result:Result<Error, model>):Action<model, action> =>
  ({ type: 'Snapshot',
     result
    }
  )

const Replay = <state, message>
  (model:state):Action<state, message> =>
  ({ type: 'Replay',
     replay: model
    }
  )

export const init = <state, message, options>
  (flags:options):Step<state, message> =>
  ([ { flags,
       snapshotURI: String(Runtime.env.replay),
       error: null,
       replayed: false
      },
     Effects.receive(Load)
    ]
  )

export const update = <state, message>
  (model:Model<state, message>,
   action:Action<state, message>
  ):Step<state, message> =>
  (action.type === 'Load'
  ? loadSnapshot(model)
  : action.type === 'Snapshot'
  ? receiveSnapshot(model, action.result)
  : action.type === 'Debuggee'
  ? nofx(model)
  : Unknown.update(model, action)
  )

const receiveSnapshot = <state, message>
  (model:Model<state, message>,
   result:Result<Error, state>
  ):Step<state, message> =>
  (result.isOk
  ? [ merge(model, {replayed: true}),
     Effects.receive(Replay(result.value))
    ]
  : nofx(merge(model, {error: result.error}))
  )

const loadSnapshot = <state, message>
  (model:Model<state, message>):Step<state, message> =>
  [ model,
   Effects.perform(fetchSnapshot(model.snapshotURI))
    .map(Snapshot)
  ]

const fetchSnapshot = <model>
  (uri:string):Task<empty, Result<Error, model>> => new Task(succeed => {
    const request = new window.XMLHttpRequest({mozSystem: true})
    request.open('GET',
     uri,
     true
    )

    request.overrideMimeType('application/json')
    request.responseType = 'json'
    request.send()

    request.onload =
      () =>
      succeed(request.status === 200
      ? ok(request.response)
      : request.status === 0
      ? ok(request.response)
      : error(Error(`Failed to fetch ${uri} : ${request.statusText}`))
      )
  })

export const render = <state, message>
  (model:Model<state, message>,
   address:Address<Action<state, message>>
  ):DOM =>
  html.dialog({ id: 'replay',
     style: Style.mix(styleSheet.base,
       (model.replayed === true
        ? styleSheet.loaded
        : styleSheet.loading
        )
      ),
     open: true
    },
   [ html.h1(null,
       [ (model.error != null
          ? String(model.error)
          : model.replayed
          ? ''
          : `Loading snapshot from ${model.snapshotURI}`
          )
        ]
      )
    ]
  )

export const view = <state, message>
  (model:Model<state, message>,
   address:Address<Action<state, message>>
  ):DOM =>
  thunk('replay',
   render,
   model,
   address
  )

const styleSheet = Style.createSheet({ base:
      { position: 'absolute',
       pointerEvents: 'none',
       background: '#fff',
       height: '100%',
       width: '100%',
       textAlign: 'center',
       lineHeight: '100vh',
       textOverflow: 'ellipsis',
       whiteSpace: 'nowrap'
      },
     loaded:
      { opacity: 0
      },
     loading:
      { opaticy: 1
      }
    }
  )
