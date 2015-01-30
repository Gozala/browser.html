define((require, exports, module) => {

"use strict";

const PouchDB = require("pouchdb");
const {spawn, async} = require("./util/task");

// PouchDB has a sepcial field `_id` for identifing records
// and `_rev` for identifiying revisitions. We will refer to
// those properties as `[PouchDB.id]` & `[PouchDB.revision]`
// instead.
PouchDB.id = "_id";
PouchDB.revision = "_rev";

// Shortcut for Object.assign.
const assign = Object.assign;

// Bunch of times we will be creating an empty objcets
// that will never get mutated, to avoid generating more
// work for GC we will reuse `EMPTY` frozen objcet in those
// cases.
const EMPTY = Object.freeze(Object.create(null));
exports.EMPTY = EMPTY;

// Helper function to convert string to a ArrayBuffer instance.
const stringToBuffer = string => new TextEncoder().encode(string);
// Helper function to create cryptographic hash of the content.
const hash = string => crypto.subtle.digest("SHA-256",
                                            stringToBuffer(string)).then(btoa);

// Record is a base class for representing records stored in the data base.
// Most record types will copy it's static methods or substitute some of them.

const Record = function(options) {
  assign(this, Record.defaults(this), options);
}
Record.Type = () => function(options) { Record.call(this, options) };
Record.id = record => record[PouchDB.id];
Record.defaults = record => {
  const {defaults} = record.constructor;
  return defaults ? defaults(record): EMPTY;
};
Record.stub = record => {
  return assign({[PouchDB.id]: record[PouchDB.id], stub: true},
                Record.toStub(record));
};
Record.toStub = record => {
  const {toStub} = record.constructor;
  return toStub ? toStub(record) : EMPTY;
};
Record.merge = (record, ...patches) => {
  return new record.constructor(assign({}, record, ...patches));
}
Record.type = record => record.constructor.type;
Record.hash = record => record.constructor.hash(record);
Record.construct = async(function*(Type, options) {
  const record = new Type(options);

  // If options passed do not include id we need to set
  // it up. This task may be async as calculating record hash
  // maybe async.
  if (!record[PouchDB.id]) {
    const type = Record.type(record);
    const hash = yield Record.hash(record);
    record[PouchDB.id] = `${type}/${hash}`;
  }
  return record;
});
Record.cast = (record, type) => {
  record.__proto__ = type.prototype;
  return record;
}
Record.write = (record, db, config) => {
  db.put(record, config);
};
Record.read = async(function*(id, constructor, db, config) {
  try {
    const record = yield db.get(id);
    return Record.cast(record, constructor);
  } catch (error) {
    if (error.status != 404) {
      throw error
    }
    return new constructor({[PouchDB.id]: id});
  }
});
Record.edit = async(function*(id, type, edit, db, config) {
  const current = yield Record.read(id, type, db);
  const edited = yield edit(current);
  return Record.write(edited, db, config);
});


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
    "quote/W29iamVjdCBBcnJheUJ1ZmZlcl0=": {_id: "quote/W29iamVjdCBBcnJheUJ1ZmZlcl0="}
  },
  tags: {
    "tag/haskell": {_id: "tag/haskell", name: "haskell"},
    "tag/functional": {_id: "tag/functional", name: "funcitonal"}
  }
}
*/

const Visit = Record.Type();
Visit.type = "visit";
Visit.defaults = () => ({start: null,
                         end: null,
                         device: "Desktop"});
Visit.toStub = record => ({start: record.start,
                           end: record.end,
                           device: record.device});

Visit.hash = record => record.start;

/**
{
  _id: "tag/haskell",
  description: "Haskell programming language",
  name: "haskell",
  items: {
    "quote/W29iamVjdCBBcnJheUJ1ZmZlcl0=": {_id: "quote/W29iamVjdCBBcnJheUJ1ZmZlcl0="},
    "site/http://learnyouahaskell.com": {_id: "site/http://learnyouahaskell.com"}
  }
}
**/

const Tag = Record.Type();
Tag.type = "tag";
Tag.defaults = () => ({name: null,
                       items: EMPTY});
Tag.hash = record => record.name;
Tag.toStub = record => {name: record.name};
Tag.idFromName = name => `${Tag.type}/${name}`;

Tag.addItem = (tag, item) => {
  const items = assign({}, tag.items, {
    [Record.id(item)]: Record.stub(item)
  });

  return Record.merge(tag, {items})
};
Tag.removeItem = (tag, item) => {
  const items = assign({}, tag.items);
  delete items[Record.id(item)];
  return Record.merge(tag, {items});
};
exports.Tag = Tag;

const TaggedItem = Record.Type();
// Updates `item.tags` by adding / removing tags passed
// in `delta`.
TaggedItem.updateTags = patch => item => {
  const tags = assign({}, item.tags);
  for (let id of Object.keys(patch)) {
    const tag = patch[id];
    if (tag == null) {
      delete tags[id];
    } else {
      tags[id] = Record.stub(tag);
    }
  }
};


const Site = Record.Type();
Site.type = "site";
Site.frequency = site => Object.keys(site.visits).length;
Site.defaults = () => ({
  backgroundColor: null,
  title: "",
  url: null,
  icons: EMPTY,
  visits: EMPTY,
  quotes: EMPTY,
  tags: EMPTY
});
Site.idFromURL = url => `${Site.type}/${url}`;
Site.visit = (site, visit) => {
  const id = Record.id(visit);
  const visits = assign({}, site.visits, {
    [Record.id(visit)]: Record.stub(visit)
  });
  return Record.merge(site, {visits});
};
Site.beginVisit = data => async(function*(site) {
  const visit = yield Record.construct(Visit, data);
  const icons = assign({}, site.icons, visit.icons);
  const {url, title, backgroundColor} = visit;

  return Record.merge(Site.visit(site, visit),
                      {url, title, backgroundColor, icons});
});
Site.endVisit = data => async(function*(site) {
  const visit = yield Record.construct(Visit, data);
  return Site.visit(site, visit);
});
Site.updateScreenshots = (...screenshots) => site => {
  const attachments = assign({}, site._attachments || EMPTY);
  for (let screenshot of screenshots) {
    const {maxWidth, maxHeight, content} = screenshot;
    const key = `${maxWidth}x${maxHeight}.screenshot`;
    attachments[key] = {content_type: content.type, data: content};
  }

  return Record.merge(site, {_attachments: attachments});
};

/**

### Quotes

Quotes store contains records of quotes that have being created by a user that
have a following structure.


{
  _id: "quote/W29iamVjdCBBcnJheUJ1ZmZlcl0=",
  content: `If you say that <span class="fixed">a</span> is 5, you can't say it's something else later because you just said it was 5. What are you, some kind of liar? So in purely functional languages, a function has no side-effects. The only thing a function can do is calculate something and return it as a result.`
  site: {
    _id: "site/http://learnyouahaskell.com/introduction#about-this-tutorial",
    url: "http://learnyouahaskell.com/introduction#about-this-tutorial"
  },
  tags: {
    "tag/functional": {_id: "tag/functional", name: "functional"}
  }
}
**/


const Quote = Record.Type();
Quote.type = "quote";
Quote.defaults = () => ({
  site: null,
  content: null,
  tags: EMPTY
});
Quote.hash = record => hash(record.content);
exports.Quote = Quote;

const Top = Record.Type();
Top.type = "top";
Top.hash = () => "sites";
Top.defaults = () => ({sites: EMPTY});
Top.sample = (site, limit) => top => {
  const sites = assign({}, top.sites, {[Record.id(site)]: site});
  const ids = Object.keys(sites);
  while (ids.length > limit) {
    const frequencies = ids.map(id => Site.frequency(sites[id]));
    const min = Math.min(...frequencies);
    const index = frequencies.indexOf(min);
    const id = ids[index];

    ids.splice(index, 1);
    delete sites[id];
  }
  return Record.merge(top, {sites});
};


// History
const History = function(options={}) {
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
};
History.prototype = {
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
      topSiteLimit: 6,
      editQueue: {}
    }
  },

  clear: async(function*() {
    yield this.sitesStore.destroy();
    yield this.quotesStore.destroy();
    yield this.tagsStore.destroy();
  }),

  scheduleEdit: async(function*(Type, id, edit, store) {
    // wait for last scehduled edit to complete.
    yield this.options.editQueue[id];
    // then execute scheduled edit.
    return Record.edit(id, Type, edit, store);
  }),
  // Edits per record are queued, to avoid data loss
  // due to concurrent edits.
  edit(Type, id, edit, store) {
    return this.options.editQueue[id] = this.scheduleEdit(Type, id, edit, store);
  },

  beginVisit(visit) {
    return this.edit(Site,
                     Site.idFromURL(visit.url),
                     Site.beginVisit(visit),
                     this.sitesStore);
  },
  endVisit(visit) {
    return this.edit(Site,
                     Site.idFromURL(visit.url),
                     Site.endVisit(visit),
                     this.sitesStore);
  },

  updateScreenshots({url}, ...screenshots) {
    return this.edit(Site,
                     Site.idFromURL(url),
                     Site.updateScreenshots(...screenshots),
                     this.sitesStore);
  },

  updateTags: async(function*(item, tags) {
    const id = Record.id(item);
    const [Type, store] = id.startsWith("site/") ? [Site, this.sitesStore] :
                          id.startsWith("quote/") ? [Quote, this.quotesStore] :
                          null;

    yield this.edit(Type, id, TaggedItem.updateTags(tags), store);

    // Edit each tag from given `tags` table.
    for (let tagId of Object.keys(tags)) {
      const tag = tags[tagId];
      const edit = tag == null ? Tag.removeItem(item) :
                          Tag.addItem(item);
      yield this.edit(Tag, tagId, edit, this.tagsStore);
    }
  }),


  onTopSitesChange({doc}) {
    const top = Record.cast(doc, Top);
    this.options.topSites = top;
    if (this.options.onTopSitesChange) {
      this.options.onTopSitesChange(top);
    }
  },
  onSiteChange({doc}) {
    const site = Record.cast(doc, Site);
    this.edit(Top, "top/sites",
              Top.sample(site, this.options.topSiteLimit),
              this.sitesStore);

    if (this.options.onSiteChange) {
      this.options.onSiteChange(site);
    }
  },

  onTagChange({doc}) {
    const tag = Record.cast(doc, Tag);
    if (this.options.onTagChange) {
      this.options.onTagChange(tag);
    }
  }
};

exports.History = History;


});
