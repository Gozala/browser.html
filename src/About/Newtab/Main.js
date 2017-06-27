/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'babel-polyfill'
import { start, Task, Subscription } from 'reflex'
import * as NewTab from './Newtab'
import { Renderer } from '@driver'

const renderer = new Renderer({target: (document.body:any)})
const application = start({
  flags: void (0),
  init: NewTab.init,
  update: NewTab.update,
  view: NewTab.view
}, ({view, task}) => {
  renderer.render(view)
  Task.perform(task)
})

window.renderer = renderer
window.application = application
