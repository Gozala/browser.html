/* this source code form is subject to the terms of the mozilla public
 * license, v. 2.0. if a copy of the mpl was not distributed with this
 * file, you can obtain one at http://mozilla.org/mpl/2.0/. */

define((require, exports, module) => {
  "use strict";

  const {Element, Field} = require("js/element");
  const {Component} = require("js/component");

  const InputElement = Element("input", {
    focused: Field((node, current, past) => {
      if (current != past) {
        if (current) {
          node.focus();
        } else {
          node.blur();
        }
      }
    })
  });
  exports.InputElement = InputElement;

  const ENTER_KEY = 13;
  const InputField = Component({
    onKey(event) {
      if (event.keyCode === ENTER_KEY) {
        this.onSubmit(event.target.value);
      }
    },
    render(options) {
      return InputElement(Object.assign({}, options, {
        onKeyDown: this.onKey
      }));
    }
  });
  exports.InputField = InputField;
});
