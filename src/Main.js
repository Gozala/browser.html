/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'babel-polyfill'
import './Common/RequestAnimationFrame'
import {start, Task} from 'reflex'
import * as UI from './Browser'
import * as Runtime from './Common/Runtime'
import {Renderer} from '@driver'
import * as Devtools from './Devtools'

const isReload = window.application != null

// If hotswap change address so it points to a new mailbox &r
// re-render.
if (isReload) {
  window.application.address(Devtools.Persist)
}

void ((document.body:any):HTMLElement)
  .classList
  .toggle('use-native-titlebar', Runtime.useNativeTitlebar())

const application = start({ flags:
      { Debuggee: UI,
       flags: void (0)
      },
     init:
      (isReload
      ? Devtools.restore
      : Devtools.init
      ),

     update: Devtools.update,
     view: Devtools.view,
}, ({view, task}) => {
  renderer.render(view)
  Task.perform(task)
})
const renderer = new Renderer({target: (document.body:any)})

window.renderer = renderer
window.application = application
