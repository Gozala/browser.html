/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {html, thunk, forward, Effects} from 'reflex';
import * as Style from '../common/style';
import * as Toolbar from "./sidebar/toolbar";
import * as Tabs from "./sidebar/tabs";
import {merge, always} from "../common/prelude";
import {cursor} from "../common/cursor";
import * as Unknown from "../common/unknown";
import * as Stopwatch from "../common/stopwatch";
import * as Easing from "eased";
import * as Display from "./sidebar/display";
import * as Animation from "../common/animation";


/*::
import type {Integer, Float} from "../common/prelude"
import type {Address, DOM} from "reflex"
import type {ID} from "./sidebar/tabs"
import * as Navigators from "./navigator-deck/deck"
import {performance} from "../common/performance"

export type Action =
  | { type: "CreateWebView" }
  | { type: "Attach" }
  | { type: "Detach" }
  | { type: "Open" }
  | { type: "Close" }
  | { type: "Activate" }
  | { type: "Animation", animation: Animation.Action }
  | { type: "CloseTab", id: Tabs.ID }
  | { type: "ActivateTab", id: Tabs.ID }
  | { type: "Tabs", tabs: Tabs.Action }
  | { type: "Toolbar", toolbar: Toolbar.Action }
*/





export class Model {
  /*::
  isAttached: boolean;
  isOpen: boolean;
  animation: Animation.Model<Display.Model>;
  toolbar: Toolbar.Model;
  */
  constructor(
    isAttached/*: boolean*/
  , isOpen/*: boolean*/
  , toolbar/*: Toolbar.Model*/
  , animation/*: Animation.Model<Display.Model>*/
  ) {
    this.isAttached = isAttached
    this.isOpen = isOpen
    this.animation = animation
    this.toolbar = toolbar
  }
}


const styleSheet = Style.createSheet({
  base:
  { backgroundColor: '#272822'
  , height: '100%'
  , position: 'absolute'
  , right: 0
  , top: 0
  , width: '320px'
  , boxSizing: 'border-box'
  , zIndex: 2 // @TODO This is a hack to avoid resizing new tab / edit tab views.
  , overflow: 'hidden'
  }
});


export const init =
  ( isAttached/*:boolean*/ = false
  , isOpen/*:boolean*/ = false
  )/*:[Model, Effects<Action>]*/ => {
    const display =
      ( isOpen
      ? Display.open
      : isAttached
      ? Display.attached
      : Display.closed
      );

    const [toolbar, $toolbar] = Toolbar.init();
    const [animation, $animation] = Animation.init(display, null);

    const model = new Model
    ( isAttached
    , isOpen
    , toolbar
    , animation
    );

    const fx = Effects.batch
    ( [ $toolbar.map(tagToolbar)
      , $animation.map(tagAnimation)
      ]
    )

    return [model, fx]
  }

export const CreateWebView/*:Action*/ =
  { type: 'CreateWebView'
  };

export const Attach/*:Action*/ =
  {
    type: "Attach"
  };

export const Detach/*:Action*/ =
  { type: "Detach"
  };

export const Open/*:Action*/ = {type: "Open"};
export const Close/*:Action*/ = {type: "Close"};
export const Activate/*:Action*/ = {type: "Activate"};
export const CloseTab/*:(id:ID) => Action*/ =
  id =>
  ({type: "CloseTab", id});
export const ActivateTab/*:(id:ID) => Action*/ =
  id =>
  ({type: "ActivateTab", id});

const tagTabs =
  action => {
    switch (action.type) {
      case "Close":
        return CloseTab(action.id);
      case "Activate":
        return ActivateTab(action.id);
      default:
        return {
          type: "Tabs"
        , tabs: action
        }
    }
  };


const tagToolbar =
  action => {
    switch (action.type) {
      case "Attach":
        return Attach;
      case "Detach":
        return Detach;
      case "CreateWebView":
        return CreateWebView;
      default:
        return {
          type: "Toolbar"
        , toolbar: action
        , action
        }
    }
  };

const tagAnimation =
  action =>
  ( { type: "Animation"
    , animation: action
    }
  );

const animate =
  (animation, action) =>
  Animation.updateWith
  ( Easing.easeOutCubic
  , Display.interpolate
  , animation
  , action
  )


const updateToolbar = cursor
  ( { get: model => model.toolbar
    , set:
      (model, toolbar) => new Model
      ( model.isAttached
      , model.isOpen
      , toolbar
      , model.animation
      )
    , tag: tagToolbar
    , update: Toolbar.update
    }
  );

const updateAnimation = cursor
  ( { get: model => model.animation
    , set:
      (model, animation) =>
      new Model
      ( model.isAttached
      , model.isOpen
      , model.toolbar
      , animation
      )
    , tag: tagAnimation
    , update: animate
    }
  )

const nofx = /*::<model, action>*/
  (model/*:model*/)/*:[model, Effects<action>]*/ =>
  [ model
  , Effects.none
  ]

const startAnimation =
  (isAttached, isOpen, toolbar, [animation, fx]) =>
  [ new Model
    ( isAttached
    , isOpen
    , toolbar
    , animation
    )
  , fx.map(tagAnimation)
  ]


const open =
  (model, now) =>
  ( model.isOpen
  ? nofx(model)
  : startAnimation
    ( model.isAttached
    , true
    , model.toolbar
    , Animation.transition
      ( model.animation
      , Display.open
      , 550
      , now
      )
    )
  );

const close =
  (model, now) =>
  ( !model.isOpen
  ? nofx(model)
  : startAnimation
    ( model.isAttached
    , false
    , model.toolbar
    , Animation.transition
      ( model.animation
      , ( model.isAtttached
        ? Display.attached
        : Display.closed
        )
      , 200
      , now
      )
    )
  );

const attach =
  (model, now) =>
  ( model.isAttached
  ? nofx(model)
  : assemble
    ( true
    , false
    , Toolbar.update(model.toolbar, Toolbar.Attach)
    , Animation.transition
      ( model.animation
      , Display.attached
      , ( model.isOpen
        ? 200
        : 100
        )
      , now
      )
    )
  )

const detach =
  ( model, now ) =>
  ( !model.isAttached
  ? nofx(model)
  : assemble
    ( false
    , model.isOpen
    , Toolbar.update(model.toolbar, Toolbar.Detach)
    , ( model.isOpen
      ? nofx(model.animation)
      : Animation.transition
        ( model.animation
        , Display.closed
        , ( model.isOpen
          ? 200
          : 100
          )
        , now
        )
      )
    )
  );

const assemble =
  ( isAttached
  , isOpen
  , [toolbar, $toolbar]
  , [animation, $animation]
  ) =>
  [ new Model
    ( isAttached
    , isOpen
    , toolbar
    , animation
    )
  , Effects.batch
    ( [ $toolbar.map(tagToolbar)
      , $animation.map(tagAnimation)
      ]
    )
  ]

export const update =
  (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ => {
    switch (action.type) {
      case "Open":
        return open(model, performance.now());
      case "Close":
        return close(model, performance.now());
      case "Attach":
        return attach(model, performance.now());
      case "Detach":
        return detach(model, performance.now());

      case "Animation":
        return updateAnimation(model, action.animation);
      case "Toolbar":
        return updateToolbar(model, action.toolbar);

      default:
        return Unknown.update(model, action);
    }
  };


export const render =
  ( model/*:Model*/
  , navigators/*:Navigators.Model*/
  , address/*:Address<Action>*/
  )/*:DOM*/ =>
  html.menu
  ( { key: 'sidebar'
    , className: 'sidebar'
    , style: Style.mix
      ( styleSheet.base
      , { transform: `translateX(${model.animation.state.x}px)`
        , boxShadow: `rgba(0, 0, 0, ${model.animation.state.shadow}) -50px 0 80px`
        , paddingLeft: `${model.animation.state.spacing}px`
        , paddingRight: `${model.animation.state.spacing}px`
        }
      )
    }
  , [ Tabs.view
      ( navigators
      , forward(address, tagTabs, model.animation.state)
      , model.animation.state
      )
    , thunk
      ( 'sidebar-toolbar'
      , Toolbar.view
      , model.toolbar
      , forward(address, tagToolbar)
      , model.animation.state
      )
    ]
  );

export const view =
  ( model/*:Model*/
  , navigators/*:Navigators.Model*/
  , address/*:Address<Action>*/
  )/*:DOM*/ =>
  thunk
  ( 'Browser/Sidebar'
  , render
  , model
  , navigators
  , address
  );
