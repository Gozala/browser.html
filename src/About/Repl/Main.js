/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'babel-polyfill'
import {start, Task, Effects} from 'reflex'
import * as UI from './Repl'
import {Renderer} from '@driver'

const isReload = window.application != null

const restore = () => [
  window.application.model.value,
  Effects.none
]

const application = start({
  flags: void (0),
  init: (
    isReload ? restore : UI.init
  ),
  update: UI.update,
  view: UI.view,
}, ({view, task}) => {
  renderer.render(view)
  Task.perform(task)
})
const renderer = new Renderer({target: (document.body:any)})

window.renderer = renderer
window.application = application
