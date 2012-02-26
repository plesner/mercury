"use strict";

// Various utilities shared between the benchmarks and the tests.

function toArray(args) {
  return Array.prototype.slice.call(args);
}

if (!Function.prototype.bind) {
  Function.prototype.bind = function () {
    var method = this;
    var args = toArray(arguments);
    var object = args.shift();
    return function() {
      return method.apply(object, args.concat(toArray(arguments)));
    };
  };
}

/**
 * Fake test implementation of chrome functionality.
 */
function FakeChrome() {
  /**
   * A set of fake bookmarks.
   */
  this.bookmarks = [];

  this.changeListener = null;

  this.defaultSuggestion = null;
}

FakeChrome.prototype.addBookmarkEventListener = function (listener) {
  // ignore for now
};

FakeChrome.prototype.addOmniboxEnteredListener = function (listener) {
  // ignore for now
};

FakeChrome.prototype.getBookmarksTree = function (callback) {
  callback([{
    title: "",
    url: "",
    children: this.bookmarks
  }]);
};

FakeChrome.prototype.setOmniboxDefaultSuggestion = function (value) {
  this.defaultSuggestion = value;
};

FakeChrome.prototype.addOmniboxChangedListener = function (listener) {
  assertTrue(this.changeListener == null);
  this.changeListener = listener;
};

FakeChrome.prototype.setOmniboxText = function (value) {
  assertTrue(this.changeListener != null);
  var suggests = [];
  this.defaultSuggestion = null;
  this.changeListener(value, function (value) {
    suggests = value;
  });
  if (this.defaultSuggestion)
    return [this.defaultSuggestion].concat(suggests);
  else
    return suggests;
};

FakeChrome.prototype.addBookmark = function (text, url) {
  this.bookmarks.push({title: text, url: url});
};

FakeChrome.prototype.clearListeners = function () {
  this.changeListener = null;
};

function defer(thunk) {
  window.setTimeout(thunk, 50);
}

function deferredFor(from, to, thunk, onDone) {
  if (from == to) {
    if (onDone != null)
      onDone();
  } else {
    defer(function () {
      thunk(from);
      deferredFor(from + 1, to, thunk, onDone);
    });
  }
}

function TestBookmark(json) {
  this.url = json.url;
  this.title = json.title;
}

TestBookmark.prototype.toString = function () {
  return "#<" + this.title + ": " + this.url + ">";
};

function TestData() {
  this.bookmarks = [];
  for (var url in top1000Sites) {
    var value = top1000Sites[url];
    if (url && value && value.url && value.title)
      this.bookmarks.push(new TestBookmark(value));
  }
  this.abbrevs = this.initAbbrevs();
}

TestData.prototype.getBookmarks = function () {
  return this.bookmarks;
};

TestData.prototype.getAbbrevs = function () {
  return this.abbrevs;
};

TestData.prototype.addBookmarks = function (chrome, countOpt) {
  if (countOpt) {
    var total = 0;
    while (total < countOpt) {
      this.getBookmarks().forEach(function (bookmark) {
        if (total < countOpt)
          chrome.addBookmark(bookmark.title, bookmark.url);
        total++;
      });
    }
  } else {
    this.getBookmarks().forEach(function (bookmark) {
      chrome.addBookmark(bookmark.title, bookmark.url);
    });
  }
};

TestData.isWord = function (str) {
  return !!(/^\w/.exec(str));
}

TestData.prototype.initAbbrevs = function (step) {
  var seen = {};
  var all = [];
  this.getBookmarks().forEach(function (bookmark) {
    var title = bookmark.title;
    var words = title.split(" ");
    var letters = "";
    words.forEach(function (word) {
      if (TestData.isWord(word)) {
        letters += word.substring(0, 1).toLowerCase();
      }
    });
    for (var i = 1; i < letters.length; i++) {
      var sub = letters.substring(0, i);
      if (!seen[sub]) {
        seen[sub] = true;
        all.push(sub);
      }
    }
  });
  return all;
};

TestData.get = function () {
  if (this.instance == null)
    this.instance = new TestData();
  return this.instance;
};
