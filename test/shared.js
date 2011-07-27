// Various utilities shared between the benchmarks and the tests.

Function.prototype.inherit = function (base) {
  function Inheriter() { }
  Inheriter.prototype = base.prototype;
  this.prototype = new Inheriter();
};

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
  callback(this.bookmarks);
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
  this.changeListener(value, function (value) {
    suggests = value;
  });
  return suggests;
};

FakeChrome.prototype.addBookmark = function (text, url) {
  this.bookmarks.push({'title': text, 'url': url});
};

FakeChrome.prototype.clearListeners = function () {
  this.changeListener = null;
};

function assertTrue(cond) {
  if (!cond) {
    FAIL;
  }
}
