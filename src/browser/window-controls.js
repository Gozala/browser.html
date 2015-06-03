/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {Record} = require('typed-immutable');
  const {html} = require('reflex');
  const {dispatchEventToGecko} = require('./embedding');


  // Model
  const ButtonStyle = Record({
    backgroundColor: 'none',
    display: 'inline-block',
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: '50%'
  })

  const WindowTheme = Record({
    minButton: ButtonStyle,
    maxButton: ButtonStyle,
    closeButton: ButtonStyle
  })

  const WindowControls = Record({
    id: 'WindowControls',
    theme: WindowTheme,
    isFocused: Boolean
  });

  // Actions

  const ChromeAction = Record({type: String});
  WindowControls.Action = ChromeAction;

  // Update

  // WindowControls only produces `ChromeAction` that do not cause state
  // changes.
  WindowControls.update = (state, action) => {
    if (action.constructor === ChromeAction) {
      dispatchEventToGecko(action.type);
    }

    return state;
  };

  // View

  const containerStyle = {
    position: 'absolute',
    top: 10,
    left: 10,
    lineHeight: '30px',
    verticalAlign: 'center',
    marginLeft: 7,
  };

  const unfocusedButton = ButtonStyle({
    backgroundColor: 'hsl(0, 0%, 86%)'
  });

  const close = _ => ChromeAction({type: 'shutdown-application'});
  const minimize = _ => ChromeAction({type: 'minimize-native-window'});
  const maximize = _ => ChromeAction({type: 'toggle-fullscreen-native-window'});

  WindowControls.view = ({isFocused, theme}) => html.div({
    key: 'WindowControlsContainer',
    style: containerStyle
  }, [
    html.div({
      key: 'WindowCloseButton',
      style: isFocused ? theme.closeButton : unfocusedButton,
      onClick: close
    }),
    html.div({
      key: 'WindowMinButton',
      style: isFocused ? theme.minButton : unfocusedButton,
      onClick: minimize
    }),
    DOM.div({
      key: 'WindowMaxButton',
      style: isFocused ? theme.maxButton : unfocusedButton,
      onClick: maximize
    })
  ]);


  module.exports = WindowControls;

});
