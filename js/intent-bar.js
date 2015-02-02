/* this source code form is subject to the terms of the mozilla public
 * license, v. 2.0. if a copy of the mpl was not distributed with this
 * file, you can obtain one at http://mozilla.org/mpl/2.0/. */

define((require, exports, module) => {
  "use strict";

  const {KeyBindings} = require("js/keyboard");
  const {Component} = require("js/component");
  const {html} = require("js/virtual-dom");
  const urlHelper = require("js/urlhelper");

  const delegate = name => {
    return function(...args) {
      return this.props[name](...args);
    }
  }

  const Input = Element({
    focused: Field((node, current, past) => {
      if (current) {
        node.focus();
        node.select();
      } else if (past) {
        node.blur();
      }
    })
  });

  const ENTER_KEY = 13;

  const IntentBar = Component({
    patch: delegate("patch"),
    navigateTo: delegate("navigateTo"),
    onClick: delegate("focusInput"),

    onFocus() {
      this.patch({focused: true});
    },
    onBlur() {
      this.patch({focused: false});
    },
    onKey(event) {
      if (event.keyCode === ENTER_KEY) {
        this.navigateTo(this.props.input);
      }
    },
    onChange(event) {
      this.patch({input: event.target.value});
    },

    render({inputFocused, input, location, url}) {
      return Input({key: "url-input",
                    className: "urlinput flex-1",
                    focused: inputFocused,
                    value: input !== null ? input :
                           location ? location :
                           url,
                    placeholder: "Search or enter address",
                    tabIndex: 0,
                    autoFocus: true,
                    contextMenu: "url-context-menu",

                    onClick: this.onClick,
                    onChange: this.onChange,
                    onKeyDown: this.onKey,
                    onFocus: this.onFocus,
                    onBlur: this.onBlur})
    }
  });
});
