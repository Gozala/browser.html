/* @flow */

import * as Unknown from './Unknown'
import {Task, Effects} from 'reflex'
import {nofx} from './Prelude'
import {ease} from 'easing.flow'

export type Time = number
export type Action =
  | { type: "Tick", time: Time }
  | { type: "End", time: Time }

import type {Interpolation, Easing} from 'easing.flow'

class Transition <model> {

  duration: Time;
  now: Time;
  elapsed: Time;
  from: model;
  to: model;

  constructor (
    from:model,
   to:model,
   now:Time,
   elapsed:Time,
   duration:Time
  ) {
    this.from = from
    this.to = to
    this.now = now
    this.elapsed = elapsed
    this.duration = duration
  }
}

export class Model <model> {

  state: model;
  transition: ?Transition<model>;

  constructor (
    state:model,
   transition:?Transition<model>
  ) {
    this.state = state
    this.transition = transition
  }
}

export const transition = <state>
  (model:Model<state>,
   to:state,
   duration:Time
  ):[Model<state>, Effects<Action>] =>
  (model.transition == null
  ? startTransition(model.state,
     to,
     0,
     duration
    )
  : model.transition.to === to
  ? nofx(model)
  : startTransition(model.state,
     to,
     duration - (duration * model.transition.elapsed / model.transition.duration),
     duration
    )
  )

const Tick =
  time =>
  ({ type: 'Tick',
     time
    }
  )

const End =
  time =>
  ({ type: 'End',
     time
    }
  )

const startTransition = <model>
  (from:model,
   to:model,
   elapsed:Time,
   duration:Time
  ):[Model<model>, Effects<Action>] =>
  [ new Model(from,
     new Transition(from,
       to,
       0,
       elapsed,
       duration
      )
    ),
   Effects.perform(Task.requestAnimationFrame().map(Tick))
  ]

export const endTransition = <state>
  (model:Model<state>
  ):[Model<state>, Effects<Action>] =>
  [ new Model(
      model.state,
      null
    ),
    Effects.perform(Task.requestAnimationFrame().map(Tick))
  ]

const tickTransitionWith = <state>
  (easing:Easing,
   interpolation:Interpolation<state>,
   model:Model<state>,
   now/* Time*/
  ):[Model<state>, Effects<Action>] =>
  (model.transition == null
  ? nofx(model)
  : interpolateTransitionWith(easing,
     interpolation,
     model.transition,
     (model.transition.now === 0
      ? 0
      : now - model.transition.now + model.transition.elapsed
      ),
     now
    )
  )

const interpolateTransitionWith = <state>
  (easing:Easing,
   interpolation:Interpolation<state>,
   transition:Transition<state>,
   elapsed:Time,
   now:Time
  ):[Model<state>, Effects<Action>] =>
  (elapsed >= transition.duration
  ? [ new Model(transition.to, null),
     Effects.receive(End(now))
    ]
  : [ new Model(ease(easing,
         interpolation,
         transition.from,
         transition.to,
         transition.duration,
         elapsed
        ),
       new Transition(transition.from,
         transition.to,
         now,
         elapsed,
         transition.duration
        )
      ),
     Effects.perform(Task.requestAnimationFrame().map(Tick))
    ]
  )

export const updateWith = <state>
  (easing:Easing,
   interpolation:Interpolation<state>,
   model:Model<state>,
   action:Action
  ):[Model<state>, Effects<Action>] => {
  switch (action.type) {
    case 'Tick':
      return tickTransitionWith(easing, interpolation, model, action.time)
    case 'End':
      return nofx(model)
    default:
      return Unknown.update(model, action)
  }
}

export const init = <state>
  (model:state):[Model<state>, Effects<Action>] =>
  nofx(new Model(model, null))
