/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {html} = require('reflex');
  const {Record, Unit} = require('typed-immutable');

  // Model

  const Progress = Record({
    id: String,
    theme: Record({
      color: String
    }),
    readyState: Record({
      progress: 0,
      loadStarted: -1,
      // When the server replied first (while loading)
      connected: -1,
      loadEnded: -1
    })
  });


  // Actions

  const ProgressChange = Record({
    // Id of the associated web view
    id: String,
    // Time of the progress change
    time: Number
  });

  const Action = ProgressChange;

  Action.ProgressChange = ProgressChange;

  Progress.Action = Action;


  // Update


  // Animation parameters:
  const A = 0.2;              // Zone A size (a full progress is equal to '1'
  const B = 0.2;              // Zone B size
  const APivot = 200;         // When to reach ~80% of zone A
  const BPivot = 500;         // When to reach ~80% of zone B
  const CDuration = 200;     // Time it takes to fill zone C

  const approach = (tMs, pivoMs) => 2 * Math.atan(tMs / pivoMs) / Math.PI;


   // Progress bar logic:
   // The progressbar is split in 3 zones. Called A, B and C.
   //   Zone A is slowly filled while the browser is connecting to the server.
   //   Zone B is slowly filled while the page is being downloaded.
   //   Zone C is filled once the page has loaded (fast).
   //   Zone A and B get filled slower and slower in a way that they are never
   //   100% filled.
  const computeProgress = ({now, loadStarted, connected, loadEnded}) => {
    // Inverse tangent function: [0 - inf] -> [0 - PI/2]
    // approach: [time, pivot] -> [0 - 1]
    // Pivot value is more or less when the animation seriously starts to slow down

    const a = loadStarted < 0 ? 0 :
              A * approach(now - loadStarted, APivot);
    const b = connected < 0 ? 0 :
              B * approach(now - connected, BPivot);
    const c = loadEnded < 0 ? 0 :
              (1 - a - b) * (now - loadEnded) / CDuration;

    return Math.min(1, a + b + c);
  };

  Progress.update = (state, action) => {
    // If `ProgressChange` action and currently rendered progess `state.id`
    // matches `action.id` then update a progess by computing its' value.
    if (action.constructor === ProgressChange && action.id === id) {
      return state.set('progress', computeProgress({
        now: action.time,
        loadStarted: state.loadStarted,
        connected: state.connected,
        loadEnded: state.loadEnded
      }))
    }

    // Otherwise return state back.
    return state;
  };

  // View

  const startFading = 0.8;    // When does opacity starts decreasing to 0
  const computeOpacity = progress =>
    progress < startFading ? 1 :
    1 - Math.pow((progress - startFading) / (1 - startFading), 1);

  Progress.view = state => {
    const node = html.div({
      key: state.id,
      zIndex: 99,
      display: 'block',
      width: '100%',
      height: 3,
      marginLeft: '-100%',
      position: 'absolute',
      top: 50,
      left: 0,
      backgroundColor: state.theme.color,
      opacity: computeOpacity(state.readyState.progress),
      transform: `translateX(${100 * state.readyState.progress}%)`,
    });

    // Schedule a `ProgressChange` action on next animation frame if
    // progress has not reached 1 yet.
    if (progress < 1) {
      onAnimationFrame(node, _ => ProgressChange({
        id: state.id,
        time: performance.now()
      }));
    }

    return node;
  };

  module.exports = Progress;
});
