define((require, exports, module) => {

"use strict";

const PouchDB = require("pouchdb");
const {spawn, async} = require("./util/task");



const assign = Object.assign;

const EMPTY = Object.freeze(Object.create(null));
exports.EMPTY = EMPTY;

const nil = new String("nil");
exports.nil = nil;

const Class = descriptor => {
  const constructor = Object.hasOwnProperty.call(descriptor, "constructor") ?
                      descriptor.constructor : function() {};
  const __proto__ = (descriptor.extend || Object).prototype;
  const statics = descriptor.static || EMPTY;
  const prototype = assign(descriptor, {__proto__,
                                        constructor,
                                        static: void(0),
                                        extend: void(0)});
  return assign(constructor, statics, {prototype});
};
exports.Class = Class;

const pouchdbID = Symbol("pouchdb/id");
const Record = Class({
  get _id() {
    this._id = this.constructor.id(this);
    return this._id;
  },
  set _id(value) {
    Object.defineProperty(this, "_id", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: value
    });
  },
  static: {
    id({_id}) {
      return _id;
    },
    stub(record) {
      return {_id: this.id(record)}
    },
    empty() {
      return new this()
    },
    patch(record) {
      return {[record._id]: record}
    },
    merge(record, ...deltas) {
      return assign(this.empty(),
                    record,
                    ...deltas);
    },

  }
});
exports.Record = Record;


/*
## Interests API

### Sites

Sites store contains records of sites that have being visited by a user.
Sites store contains records of the following schema (which could be extended
in the future).

{
  _id: "site/http://learnyouahaskell.com/introduction#about-this-tutorial",
  url: "http://learnyouahaskell.com/introduction#about-this-tutorial",
  title: "Introduction - Learn You a Haskell for Great Good!",
  icons: {
    "http://learnyouahaskell.com/favicon.png": {
      "href": "http://learnyouahaskell.com/favicon.png",
      "rel": "shortcut icon"
    }
  },
  backgroundColor: "rgb(255, 255, 255)",
  visits: {
    "visit/1421434329682266": {
      start: 1421434329682266,
      end: 1421434484899,
      device: "Desktop"
    }
  },
  quotes: {
    "quote/1421359011208": {_id: "quote/1421359011208"}
  },
  tags: {
    "tag/haskell": {_id: "tag/haskell", name: "haskell"},
    "tag/functional": {_id: "tag/functional", name: "funcitonal"}
  }
}
*/

const Visits = Class({
  extend: Record,

  start: null,
  end: null,
  device: "",

  static: {
    id({start}) {
      return `visit/${start}`
    },
    empty: Record.empty,
    merge: Record.merge,
    update(visits, visit) {
      const id = this.id(visit);
      return this.merge(visits, {
        [id]: assign({}, visits[id] || EMPTY, visit, {_id: id})
      })
    }
  }
});
exports.Visits = Visits;

/**
{
  _id: "tag/haskell",
  description: "Haskell programming language",
  name: "haskell",
  items: {
    "quote/1421359011208": {_id: "quote/1421359011208"},
    "site/http://learnyouahaskell.com": {_id: "site/http://learnyouahaskell.com"}
  }
}
**/

const Tag = Class({
  extend: Record,

  name: null,
  items: EMPTY,

  static: {
    empty: Record.empty,
    merge: Record.merge,
    id({name}) {
      return `tag/${name}`
    },
    stub({name}) {
      return {_id: this.id({name}), name};
    },
    addItem(tag, item) {
      const id = item.constructor.id(item);
      this.merge(tag, {
        items: assign({}, tag.items, {
          [id]: item.constructor.stub(item)
        })
      });
    },
    removeItem(tag, item) {
      const id = item.constructor.id(item);
      const items = assign({}, tag.items);
      delete items[id];
      this.merge(tag, {items});
    }
  }
});
exports.Tag = Tag;

const TaggedItem = Class({
  static: {
    /**
    Updates `item.tags` by adding / removing tags passed
    in `delta`.
    **/
    updateTags(delta) {
      return item => {
        const tags = assign({}, item.tags);
        for (let id of Object.keys(delta)) {
          const tag = delta[id];
          if (tag === nil) {
            delete tags[id]
          }
          else {
            tags[id] = Tag.stub(tag);
          }
        }

        return this.merge(item, {tags});
      }
    }
  }
});
exports.TaggedItem = TaggedItem;

const Site = Class({
  extend: Record,

  url: null,
  title: "",
  icons: EMPTY,
  backgroundColor: null,
  visits: EMPTY,
  quotes: EMPTY,
  tags: EMPTY,

  static: {
    merge: Record.merge,
    empty() {
      return assign(new this(), {
        icons: EMPTY,
        visits: EMPTY,
        quotes: EMPTY,
        tags: EMPTY
      })
    },
    id({url}) {
      return `site/${url}`
    },
    frequency(site) {
      return Object.keys(site.visits).length;
    },
    beginVisit({icons, url, backgroundColor, title, start, end, device}) {
      return (site=this.empty()) => this.merge(site, {
        url, title, backgroundColor,
        icons: assign({}, site.icons, icons),
        visits: Visits.update(site.visits, {start, end, device})
      });
    },
    endVisit(visit) {
      return site => this.merge(site, {
        visits: Visits.update(site.visits, visit)
      });
    },
    updateScreenshots(...screenshots) {
      return site => {
        const patch = {}
        for (let screenshot of screenshots) {
          const {maxWidth, maxHeight, content} = screenshot;
          const key = `${maxWidth}x${maxHeight}.screenshot`;
          patch[key] = {content_type: content.type, data: content};
        }

        return this.merge(site, {
          _attachments: assign({}, site._attachments || EMPTY, patch)
        })
      }
    },
    updateTags: TaggedItem.updateTags,

    updateTop(site, limit) {
      // On initial run db won't contain `top/sites` document there for
      // top will be void. To handle initial case properly we provide a
      // empty default.
      return (top={_id: "top/sites", sites: EMPTY}) => {
        const sites = assign({}, top.sites, {[Site.id(site)]: site});
        const ids = Object.keys(sites);
        if (ids.length > limit) {
          const scores = ids.map(id => Site.frequency(sites[id]));
          const min = Math.min(...scores);
          const id = ids.indexOf(scores.indexOf(min));
          delete sites[id];
        }

        return Object.assign({}, top, {sites});
      }
    }
  }
});
exports.Site = Site;

/**

### Quotes

Quotes store contains records of quotes that have being created by a user that
have a following structure.


{
  _id: "quote/1421359011208",
  quote: `If you say that <span class="fixed">a</span> is 5, you can't say it's something else later because you just said it was 5. What are you, some kind of liar? So in purely functional languages, a function has no side-effects. The only thing a function can do is calculate something and return it as a result.`
  site: {
    _id: "site/http://learnyouahaskell.com/introduction#about-this-tutorial",
    url: "http://learnyouahaskell.com/introduction#about-this-tutorial"
  },
  tags: {
    "tag/functional": {_id: "tag/functional", name: "functional"}
  }
}
**/

const Quote = Class({
  extend: Record,

  site: null,
  quote: null,
  tags: EMPTY,


  static: {
    GUID: Date.now(),
    empty: Record.empty,
    merge: Record.merge,
    id({_id}) {
      return _id ? _id : `quote/${++this.GUID}`;
    },
    updateTags: TaggedItem.updateTags
  }
});
exports.Quote = Quote;


// History

const History = Class({
  constructor(options={}) {
    this.onSiteChange = this.onSiteChange.bind(this);
    this.onTopSitesChange = this.onTopSitesChange.bind(this);

    this.options = assign({}, this.defaults(), options);
    const {sitesStore, quotesStore, tagsStore,
           sitesStoreName, quotesStoreName, tagsStoreName} = this.options;

    this.sitesStore = sitesStore || new PouchDB(sitesStoreName);
    this.quotesStore = quotesStore || new PouchDB(quotesStoreName);
    this.tagsStore = tagsStore || new PouchDB(tagsStoreName);

    this.setupChangeFeeds();
    this.setupListeners();
  },
  setupChangeFeeds() {
    this.topSiteChangeFeed = this.sitesStore.changes({
      since: "now",
      live: true,
      include_docs: true,
      doc_ids: ["top/sites"]
    });

    this.sitesChangeFeed = this.sitesStore.changes({
      since: "now",
      live: true,
      filter: change => change._id.startsWith("site/"),
      include_docs: true
    });
  },
  setupListeners() {
    this.topSiteChangeFeed.on("change", this.onTopSitesChange);
    this.sitesChangeFeed.on("change", this.onSiteChange);
  },
  defaults() {
    return {
      sitesStoreName: "sites",
      quotesStoreName: "quotes",
      tagsStoreName: "tags",
      topSiteLimit: 6
    }
  },

  editRecord: async(function*(db, id, edit, config) {
    let record;
    try {
      record = yield db.get(id);
    } catch (error) {
      if (error.status != 404) {
        throw error;
      }
    }

    return db.put(edit(record), config);
  }),


  editSite({url}, edit, config) {
    return this.editRecord(this.sitesStore,
                           Site.id({url}),
                           edit,
                           config);
  },
  editTag({name}, edit, config) {
    return this.editRecord(this.tagsStore,
                           Tag.id({name}),
                           edit,
                           config);
  },
  editQuote(quote, edit, config) {
    return this.editRecord(this.quotesStore,
                           Quote.id(quote),
                           edit,
                           config);
  },
  editTopSites(edit, config) {
    return this.editRecord(this.sitesStore,
                           "top/sites",
                           edit,
                           config);
  },

  beginVisit(visit) {
    return this.editSite(visit, Site.beginVisit(visit));
  },
  endVisit(visit) {
    return this.editSite(visit, Site.endVisit(visit));
  },

  readTopSites: async(function*() {
    if (!this.options.topSites) {
      try {
        this.options.topSites = yield this.sitesStore.get("top/sites");
      } catch (error) {
        if (error.status == 404) {
          this.options.topSites = {_id: "top/sites", sites: {}};
        }
        else {
          throw error;
        }
      }
    }
  }),


  updateTags: async(function*(item, tags) {
    // Edit `item.tags` with a `tags` changes.
    if (item.id.startsWith("site/")) {
      yield this.editSite(item, Site.updateTags(tags))
    }

    if (item.id.startsWith("quote/")) {
      yield this.editQuote(item, Quote.updateTags(tags))
    }

    // Edit each tag from given `tags` table.
    for (let tag of Object.keys(tags)) {
      const tag = tags[tagId];
      if (tag === nil) {
        yield this.editTag({name: tagId.replace("tags/", "")},
                           Tag.removeItem(item));
      } else {
        yield this.editTag(tag, Tag.addItem(item));
      }
    }
  }),

  updateScreenshots({url}, ...screenshots) {
    return this.editSite({url},
                         Site.updateScreenshots(...screenshots));
  },

  onTopSitesChange({doc}) {
    this.options.topSites = doc;
    if (this.options.onTopSitesChange) {
      this.options.onTopSitesChange(doc);
    }
  },
  onSiteChange({doc: site}) {
    this.editTopSites(Site.updateTop(site, this.options.topSiteLimit));
    if (this.options.onSiteChange) {
      this.options.onSiteChange(site);
    }
  },

  onTagChange(change) {

  }
});
exports.History = History;

});
