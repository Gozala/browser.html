/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {DOM} = require('react')
  const Component = require('omniscient');
  const {throttle, compose} = require('lang/functional');
  const {Suggestions} = require('./suggestion-box');
  const Editable = require('common/editable');
  const {WebView} = require('./web-view');
  const {Previews} = require('./preview-box');
  const {getDomainName} = require('common/url-helper');
  const {KeyBindings} = require('common/keyboard');
  const {mix} = require('common/style');
  const {isPrivileged} = require('common/url-helper');

  // Model

  const LocationBarStyle = Record({
    display: 'inline-block',
    position: 'relative',
    MozWindowDragging: 'no-drag',
    borderRadius: 3,
    lineHeight: '30px',
    width: 460, // FIXME :Doesn't shrink when window is narrow
    height: 30,
    padding: '0 30px',
    margin: '0 67px',
    backgroundColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden'
  });

  const ButtonStyle = Record({
    opacity: Maybe(Number),
    pointerEvents: Maybe(String),
    display: Maybe(String),

    position: 'absolute',
    top: 0,
    width: 30,
    height: 30,
    fontFamily: 'FontAwesome',
    textAlign: 'center',
    fontSize: '17px',
    verticalAlign: 'middle',
    cursor: 'default'
  });

  const URLInputStyle = Record({
    padding: Maybe(Number),
    maxWidth: Maybe(Number),

    lineHeight: '30px',
    overflow: 'hidden',
    width: '100%',
    borderRadius: 0
  });

  const PageSummaryStyle = Record({
    lineHeight: '30px',
    overflow: 'hidden',
    width: '100%',
    display: 'inline-block',
    textOverflow: 'ellipsis',
    textAlign: 'center'
  });

  const LocationTextStyle = Record({
    fontWeight: 'bold'
  });

  const TitleTextStyle = Record({
    padding: 5
  });

  const LocationBar = Record({
    id: 'LocationBar',
    input: Editable,
    uri: Maybe(String),
    title: Maybe(String),
    viewID: String,
    selectedSuggestion: Maybe(String),
    userInput: Maybe(String),
    progress: 0,
    theme: Record({
      backButton: ButtonStyle({left: 0}),
      reloadButton: ButtonStyle({right: 0}),
      urlInput: URLInputStyle, //
      pageSummary: PageSummaryStyle, // used to be pageInfoText
      locationText: LocationTextStyle,
      titleText: TitleTextStyle,
      locationBar: LocationBarStyle
    })
  });

  // Actions

  const {Focus, Blur, Select, Change} = Editable.Actions;


  // Focus input & requests suggestions for the .value.
  const Enter = Record({
    value: String,
    timeStamp: Number
  });
  Enter.fromEvent = event => Enter({
    value: event.target.value,
    timeStamp: event.timeStamp
  });

  // Blur input & request suggestions for the .value
  const Exit = Record({
    timeStamp: Number
  });

  const Submit = Record({
    value: String,
    timeStamp: Number
  });
  Sumbit.fromEvent = event => Submit({
    value: event.target.value,
    timeStamp: event.timeStamp
  });

  const Preview = Record({
    timeStamp: Number
  });


  const GoBack = Record({id: String});
  const GoForward = Record({id: String});
  const Stop = Record({id: String});
  const Reload = Record({id: String});


  LocationBar.Action = Union(Focus, Blur, Select, Change,
                             Enter, Exit, Sumbit, Preview,
                             GoBack, GoForward, Stop, Reload);


  // Update

  const collapse = style =>
    /* We don't use display:none. We want the input to be focussable */
    style.merge({maxWidth: 0, padding: 0});

  const disable = style =>
    style.merge({opacity: 0.2, pointerEvents: 'none'});

  const hide = style =>
    style.merge({display: 'none'});

  const updateInput = (state, actions) =>
    state.set('input', Editable.update(state.input, action));

  LocationBar.update = (state, action) => {
    if (action.constructor === Enter) {
      state = updateInput(state, Focus(action));
      return updateInput(state, Select.All(action));
    }

    if (action.constructor === Exit) {
      return updateInput(state, Blur(action));
    }

    if (action.constructor === Select) {
      return updateInput(state, action);
    }

    if (action.constructor === Change) {
      return state.set('userInput', action.value)
                  .remove('selectedSuggestion');
    }

    return state;
  }

  // View

  const Binding = KeyBindings({
    'up': SuggestPrevious,
    'constrol p': SuggestPrevious,
    'down': SuggestNext,
    'control n': SuggestNext,
    'enter': Submit.fromEvent,
    'escape': Exit,
    'accel l': Enter.fromEvent
  });


  const BackIcon = '\uf053';
  const GearIcon = '\uf013';
  const LockIcon = '\uf023';
  const ReloadIcon = '\uf01e';
  const StopIcon = '\uf00d';


  LocationBar.view = state => html.div({
    key: state.id,
    style: state.theme.locationBar,
    onMouseEnter: Preview
  }, [
    html.div({
      key: 'back',
      onClick: _ => GoBack({id: state.viewID}),

      // {left: 0} ??
      style: state.canGoBack ? state.theme.backButton :
             ButtonStyle.disable(state.theme.backButton)
    }, [BackIcon]),
    html.input({
      key: 'input',
      placeholder: 'Search or enter address',
      type: 'text',
      value: state.selectedSuggestion || state.userInput,
      style: state.input.isFocused ? theme.urlInput :
             collapse(theme.urlInput),
      isFocused: input.isFocused,

      selectionStart: input.selection.start,
      selectionEnd: input.selection.end,
      selectionDirection: input.selection.direction,

      onSelect: Select.fromEvent,
      onChange: Change.fromEvent,

      onFocus: Enter.fromEvent,
      onBlur: Exit,
      onKeyDown: Binding
    }),
    html.p({
      key: 'page-info',
      style: state.input.isFocused ? theme.pageSummary :
             collapse(theme.pageSummary),
      onClick: Enter.fromEvent,
    }, [
      html.span({
        key: 'securityicon',
        style: {
          fontFamily: 'FontAwesome',
          fontWeight: 'normal',
          marginRight: 6,
          verticalAlign: 'middle'
        }
      }, [
        isPrivileged(state.uri) ? GearIcon :
        state.security.state == 'secure' ? LockIcon :
        ''
      ]),
      html.span({
        key: 'location',
        style: state.theme.locationText
      }, [state.uri ? getDomainName(state.uri) : '']),
      html.span({
        key: 'title',
        style: state.theme.titleText
      }, [
        state.title ? state.title :
        state.loadStarted > 0 ? 'Loading...' :
        'New Tab'
      ]),
    ]),
    html.div({
      key: 'reload-button',
      style: isLoading(state) ? hide(state.theme.reloadButton) :
             !state.uri ? disable(state.theme.reloadButton) :
             state.reloadButton,
      onClick: _ => Reload({id: state.viewID}),
    }, [ReloadIcon]),
    html.div({
      key: 'stop-button',
      style: isLoading(state) ? hide(state.theme.stopButton) :
             state.theme.stopButton,
      onClick: _ => Stop({id: state.viewID}),
    }, [StopButton])
  ]);

  module.exports = LocationBar;
});
