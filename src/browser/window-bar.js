/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {DOM} = require('react')
  const Component = require('omniscient');
  const ClassSet = require('common/class-set');
  const {mix} = require('common/style');
  const {ProgressBar} = require('./progress-bar');
  const {WindowControls} = require('./window-controls');
  const {LocationBar} = require('./location-bar');

  const LocationBar = Record({

  })

  const

  const navbarStyle = {
    backgroundColor: 'inherit',
    MozWindowDragging: 'drag',
    padding: 10,
    position: 'relative',
    scrollSnapCoordinate: '0 0',
    transition: 'background-color 200ms ease',
    textAlign: 'center'
  };

  const WindowBar = Component(function WindowBar(state, handlers) {
    const {key, input, tabStrip, webView, suggestions,
           title, rfa, theme, isDocumentFocused} = state;
    return DOM.div({
      key,
      style: mix(navbarStyle, theme.navigationPanel),
      className: ClassSet({
        navbar: true,
        cangoback: webView.canGoBack,
        canreload: webView.uri,
        loading: webView.isLoading,
        ssl: webView.securityState == 'secure',
        sslv: webView.securityExtendedValidation,
      })
    }, [
      render(WindowControls({isFocused, theme})),
      LocationBar.render(LocationBar({
        key: 'navigation',
        input, tabStrip, webView,
        suggestions, title, theme
      }), handlers),
      render(Progress({id, readyState, theme: theme.progressbar}))
    ])
  });

  // Exports:

  exports.WindowBar = WindowBar;

});
