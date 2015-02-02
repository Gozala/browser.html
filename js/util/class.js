define((require, exports, module) => {
"use strict";

const assign = Object.assign;
const Constructor = base => function(...args) {
  base.call(this, ...args);
}

// Helper factory that pretty much follows ES6 Class syntax and conventions.
const Class = prototype => {
  return Class.extends(Object, prototype);
};
Class.extends(base, prototype) => {
  prototype.__proto__ = base.prototype;
  const constructor = Object.hasOwnProperty.call(prototype, "constructor") ?
                      prototype.constructor :
                      Constructor(base);
  constructor.prototype = prototype;
  prototype.constructor = constructor;
  return constructor;
};
exports.Class = Class;

});
