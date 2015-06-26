require.config({
  baseUrl: 'node_modules/',
  nodeIdCompat: true,
  paths: {
    browser: '../lib/browser',
    common: '../lib/common',
    lang: '../lib/lang',
    shims: '../lib/shims',
    // http://facebook.github.io/react/
    react: 'react/dist/react',
    // http://facebook.github.io/immutable-js/
    // Because of the bug https://github.com/facebook/immutable-js/pull/297
    // we use forked version until it's uplifted.
    immutable: 'immutable/dist/immutable',
    'typed-immutable': 'typed-immutable/lib/',
    // http://omniscientjs.github.io
    omniscient: 'omniscient/dist/omniscient',
    // https://github.com/broofa/node-uuid
    uuid: 'node-uuid/uuid',
    pouchdb: 'pouchdb/dist/pouchdb'
  },
  shim: {
    omniscient: {
      deps: ['shims/omniscient']
    },
    pouchdb: {
      exports: 'PouchDB'
    }
  }
});


require(['browser/index']);
require(['browser/embedding']);
