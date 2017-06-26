/* @flow */

import {Effects, Task, html, thunk} from 'reflex'
import {merge, always, nofx} from '../Common/Prelude'
import {ok, error} from '../Common/Result'
import * as Unknown from '../Common/Unknown'
import * as Style from '../Common/Style'

import type {Address, DOM} from 'reflex'
import type {Result} from '../Common/Result'
import type {URI, ID} from '../Common/Prelude'

export type Gist =
  { id: ID,
   url: URI,
   description: String,
   public: boolean,
   files:
    { "snapshot.json":
      { size: number,
       raw_url: URI,
       type: "application/json",
       language: "JSON",
       truncated: boolean,
       "content": JSON
      }
    },
   html_url: URI,
   created_at: String,
   updated_at: String
  }

export type Model <model, action> = // eslint-disable-line no-unused-vars
  { status: 'Idle' | 'Pending',
   description: string
  }

export type Action <model, action> = // eslint-disable-line no-unused-vars
  | { type: "NoOp" }
  | { type: "Debuggee", debuggee: action }
  | { type: "PrintSnapshot" }
  | { type: "PrintedSnapshot" }
  | { type: "PublishSnapshot" }
  | { type: "PublishedSnapshot", result: Result<Error, Gist> }

type Step <model, action> =
  [ Model<model, action>,
   Effects<Action<model, action>>
  ]

const NoOp = always({ type: 'NoOp' })
const PrintedSnapshot = always({ type: 'PrintedSnapshot' })
const PublishedSnapshot = <model, action>
  (result:Result<Error, Gist>):Action<model, action> =>
  ({ type: 'PublishedSnapshot',
     result
    }
  )

export const init = <model, action>
  ():Step<model, action> =>
  ([ { status: 'Idle',
       description: ''
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
  : action.type === 'PrintSnapshot'
  ? printSnapshot(model)
  : action.type === 'PrintedSnapshot'
  ? printedSnapshot(model)
  : action.type === 'PublishSnapshot'
  ? publishSnapshot(model)
  : action.type === 'PublishedSnapshot'
  ? publishedSnapshot(model, action.result)
  : action.type === 'Debuggee'
  ? nofx(model)
  : Unknown.update(model, action)
  )

const createSnapshot = <state, message>
  (model:Model<state, message>):Task<Error, string> =>
  new Task((succeed, fail) => {
    try {
      succeed(JSON.stringify(window.application.model.value.debuggee))
    } catch (error) {
      fail((error:Error))
    }
  })

const printSnapshot = <state, message>
  (model:Model<state, message>):Step<state, message> =>
  [
    merge(model, { status: 'Pending', description: 'Printing...' }),
    Effects.batch([
        Effects
          .perform(createSnapshot(model)
                    .capture(error => Unknown.error(error))
                    .chain(snapshot => Unknown.log(`\n\n${snapshot}\n\n`)))
          .map(NoOp),
        Effects
          .perform(Task.sleep(200))
          .map(PrintedSnapshot)
        ]
      )
  ]

const printedSnapshot = <state, message>
  (model:Model<state, message>):Step<state, message> =>
  [ merge(model, { status: 'Idle', description: '' }),
   Effects.none
  ]

const publishSnapshot = <state, message>
  (model:Model<state, message>):Step<state, message> =>
  [ merge(model, { status: 'Pending', description: 'Publishing...' }),
   Effects.perform(createSnapshot(model)
      .chain(uploadSnapshot)
      .map(ok)
      .recover(error)
    )
    .map(PublishedSnapshot)
  ]

const publishedSnapshot = <state, message>
  (model:Model<state, message>,
   result:Result<Error, Gist>
  ):Step<state, message> =>
  [ merge(model, { status: 'Idle', description: '' }),
   Effects.perform(result.isError
    ? Unknown.error(result.error)
    : Unknown.log(`Snapshot published as gist #${result.value.id}: ${result.value.html_url}`)
    )
  ]

const uploadSnapshot =
  (snapshot:string):Task<Error, Gist> =>
  new Task((succeed, fail) => {
    const request = new window.XMLHttpRequest({mozSystem: true})
    request.open('POST', 'https://api.github.com/gists', true)
    request.responseType = 'json'
    request.send(JSON.stringify({ 'description': 'Browser.html generated state snapshot',
         'public': true,
         'files':
          { 'snapshot.json':
            { 'content': snapshot }
          }
        }
      )
    )

    request.onload = () =>
    (request.status === 201
    ? succeed(request.response)
    : fail(Error(`Failed to upload snapshot : ${request.statusText}`))
    )
  })

export const render = <state, message>
  (model:Model<state, message>,
   address:Address<Action<state, message>>
  ):DOM =>
  html.dialog({ id: 'record',
     style: Style.mix(styleSheet.base,
       (model.status === 'Pending'
        ? styleSheet.flash
        : styleSheet.noflash
        )
      ),
     open: true
    },
   [ html.h1(null, [model.description])
    ]
  )

export const view = <state, message>
  (model:Model<state, message>,
   address:Address<Action<state, message>>
  ):DOM =>
  thunk('record',
   render,
   model,
   address
  )

const styleSheet = Style.createSheet({ base:
      { position: 'absolute',
       pointerEvents: 'none',
       background: '#fff',
       opacity: 0,
       height: '100%',
       width: '100%',
       transitionDuration: '50ms',
      // @TODO: Enable once this works properly on servo.
      // , transitionProperty: "opacity"
       transitionTimingFunction: 'ease',
       textAlign: 'center',
       lineHeight: '100vh'
      },
     flash:
      { opacity: 0.9
      },
     noflash: null
    }
  )
