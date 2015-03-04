if (!Object.assign) {
  Object.assign = function (target, source) {
    var from;
    var keys;
    var to = target;

    for (var s = 1; s < arguments.length; s++) {
      from = arguments[s];
      keys = Object.keys(Object(from));

      for (var i = 0; i < keys.length; i++) {
        to[keys[i]] = from[keys[i]];
      }
    }

    return to;
  };
};


/*! https://mths.be/array-from v0.2.0 by @mathias */
if (!Array.from) {
  (function() {
    'use strict';
    var fromIterator = function(to, iterator) {
      while (true) {
        var step = iterator.next()
        if (step.done) {
          return;
        } else {
          to.push(step.value);
        }
      }
    }

    var defineProperty = (function() {
      // IE 8 only supports `Object.defineProperty` on DOM elements.
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
      } catch(error) {}
      return result || function put(object, key, descriptor) {
        object[key] = descriptor.value;
      };
    }());
    var toStr = Object.prototype.toString;
    var isCallable = function(fn) {
      // In a perfect world, the `typeof` check would be sufficient. However,
      // in Chrome 1–12, `typeof /x/ == 'object'`, and in IE 6–8
      // `typeof alert == 'object'` and similar for other host objects.
      return typeof fn == 'function' || toStr.call(fn) == '[object Function]';
    };
    var toInteger = function(value) {
      var number = Number(value);
      if (isNaN(number)) {
        return 0;
      }
      if (number == 0 || !isFinite(number)) {
        return number;
      }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    };
    var maxSafeInteger = Math.pow(2, 53) - 1;
    var toLength = function(value) {
      var len = toInteger(value);
      return Math.min(Math.max(len, 0), maxSafeInteger);
    };
    var from = function(arrayLike) {
      var C = this;
      if (arrayLike == null) {
        throw new TypeError('`Array.from` requires an array-like object, not `null` or `undefined`');
      }
      var items = Object(arrayLike);
      var mapping = arguments.length > 1;

      var mapFn, T;
      if (arguments.length > 1) {
        mapFn = arguments[1];
        if (!isCallable(mapFn)) {
          throw new TypeError('When provided, the second argument to `Array.from` must be a function');
        }
        if (arguments.length > 2) {
          T = arguments[2];
        }
      }

      if ('length' in items) {
        var len = toLength(items.length);
        var A = isCallable(C) ? Object(new C(len)) : new Array(len);
        var k = 0;
        var kValue, mappedValue;
        while (k < len) {
          kValue = items[k];
          if (mapFn) {
            mappedValue = typeof T == 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
          } else {
            mappedValue = kValue;
          }
          defineProperty(A, k, {
            'value': mappedValue,
            'configurable': true,
            'enumerable': true
          });
          ++k;
        }
        A.length = len;
      } else if ('size' in items) {
        var len = toLength(items.length);
        var A = isCallable(C) ? Object(new C(len)) : new Array(len);
        fromIterator(A, items.values());
      }
      return A;
    };
    defineProperty(Array, 'from', {
      'value': from,
      'configurable': true,
      'writable': true
    });
  }());
}


var win = nwDispatcher.nwGui.Window.get();
win.showDevTools('');

/*
win.on("devtools-opened", function(url) {
    console.log("devtools-opened: " + url);
    document.getElementById('devtools').src = url;
});
*/
requirejs.config({
//  scriptType: 'text/javascript;version=1.8',
  baseUrl: 'node_modules/',
  nodeIdCompat: true,
  paths: {
    browser: '../lib/browser',
    shims: '../lib/shims',
    lang: '../lib/lang',
    // http://facebook.github.io/react/
    react: 'react/dist/react',
    // http://facebook.github.io/immutable-js/
    // Because of the bug https://github.com/facebook/immutable-js/pull/297
    // we use forked version until it's uplifted.
    immutable: 'immutable/dist/immutable',
    'immutable/cursor': 'immutable/contrib/cursor/index',
    // http://omniscientjs.github.io
    omniscient: 'omniscient/dist/omniscient',
    // https://github.com/broofa/node-uuid
    uuid: 'node-uuid/uuid'
  },
  shim: {
    'immutable/cursor': {
      exports: 'Cursor',
      deps: ['shims/immutable-cursor', 'immutable']
    },
    omniscient: {
      deps: ['shims/omniscient']
    },
    pouchdb: {
      exports: 'PouchDB'
    }
  }
});


requirejs(['browser/index']);
requirejs(['browser/embedding']);
