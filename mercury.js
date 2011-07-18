/**
 * A bookmark with a path (its parents as a list), a title and a target url.
 */
function Bookmark(path, url) {
  /**
   * An ordered list of parent titles, starting at the top of the tree.
   */
  this.path = path;

  /**
   * The URL of this bookmark.
   */
  this.url = url;
}

/**
 * For debugging.
 */
Bookmark.prototype.toString = function () {
  return "bookmark(path: " + this.path + ", url: " + this.url + ")";
};

/**
 * Returns a human-readable description of this bookmark.
 */
Bookmark.prototype.getDescription = function () {
  var reversePath = [];
  for (var i = this.path.length - 1; i > 0; i--)
    reversePath.push(this.path[i]);
  return "<match>" + this.path[0] + "</match> - " + reversePath.join(" / ");
};

/**
 * Returns a score vector of this bookmark agains the given input.
 */
Bookmark.prototype.getScore = function (input) {
  return scoreVectors(this.path, input);
};

/**
 * Determines if the given needle occurs in the haystack, not necessarily
 * contiguously, returning a non-negative value if it does.  The smaller the
 * score the "better" it is, 0 meaning a perfect match.
 */
function getDistance(haystack, needle) {
  if (needle.length > haystack.length)
    return -1;
  var cursor = 0;
  var score = 0;
  for (var i = 0; i < needle.length; i++) {
    var next = needle[i];
    var match = haystack.indexOf(next, cursor);
    if (match == -1)
      return -1;
    score += (match - cursor);
    cursor = match + 1;
  }
  if (cursor < haystack.length)
    score += 1;
  return score;
}

function scoreVectors(base, input) {
  if (base.length < input.length) {
    return null;
  }
  var baseCursor = 0;
  var matches = [];
  for (var i = 0; i < input.length; i++) {
    var foundOne = false;
    var minMatch = Infinity;
    var maxMatch = -Infinity;
    for (var j = baseCursor; j < base.length; j++) {
      var plainDist = getDistance(base[j], input[i]);
      if (plainDist >= 0) {
        foundOne = true;
        matches.push([i, j, plainDist + (j - i)]);
        if (j < minMatch)
          minMatch = j;
        maxMatch = j;
      }
    }
    if (!foundOne) {
      return null;
    }
    baseCursor = minMatch + 1;
  }
  var result = [];
  var next = 0;
  for (var i = 0; i < matches.length; i++) {
    if (matches[i][0] == next) {
      result.push(matches[i][2]);
      next++;
    }
  }
  return result;
}

/**
 * A repository of bookmarks that keeps itself updated as the underlying
 * bookmarks change.
 */
function BookmarkRepository() {
  /**
   * A list of bookmark objects.
   */
  this.bookmarks = null;

  /**
   * Have we already started reloading bookmarks?
   */
  this.isReloading = false;

  this.initialize();
}

/**
 * One-time setup to hook this into chrome's bookmark system.
 */
BookmarkRepository.prototype.initialize = function () {
  chrome.bookmarks.onChanged.addListener(this.reload.bind(this));
  chrome.bookmarks.onCreated.addListener(this.reload.bind(this));
  chrome.bookmarks.onRemoved.addListener(this.reload.bind(this));
  this.reload();
};

/**
 * Refresh the repository by reading bookmarks information from chrome.
 */
BookmarkRepository.prototype.reload = function () {
  if (this.isReloading)
    return;
  this.isReloading = true;
  chrome.bookmarks.getTree(this.onFetched.bind(this));
};

/**
 * Update the set of bookmarks we know about to a new set fetched from chrome.
 */
BookmarkRepository.prototype.onFetched = function (tree) {
  this.bookmarks = [];
  for (var i = 0; i < tree.length; i++) {
    this.addBookmarks(tree[i], []);
  }
  this.isReloading = false;
};

var kTitleBlacklist = ["", "bookmarks bar", "other bookmarks"];

/**
 * Add the given bookmark tree node to the repository.
 */
BookmarkRepository.prototype.addBookmarks = function (node, path) {
  var url = node.url;
  var title = node.title.toLowerCase();
  var newPath = [];
  if (kTitleBlacklist.indexOf(title) == -1)
    newPath.push(title);
  for (var i = 0; i < path.length; i++)
    newPath.push(path[i]);
  if (url) {
    // We're at a bookmark, add it to the list.
    this.bookmarks.push(new Bookmark(newPath, url));
  } else {
    // We're at a folder, recursively add bookmarks.
    var children = node.children;
    for (var i = 0; i < children.length; i++)
      this.addBookmarks(children[i], newPath);
  }
};

/**
 * Main handler for this extension.
 */
function Mercury() {
  this.bookmarks = new BookmarkRepository();
  this.lastSuggestions = null;
}

/**
 * Main entry-point.
 */
Mercury.prototype.main = function () {
  this.install();
};

/**
 * Returns a list of all the bookmarks.
 */
Mercury.prototype.getBookmarks = function () {
  return this.bookmarks.bookmarks;
};

/**
 * Install ourselves through the appropriate chrome hooks.
 */
Mercury.prototype.install = function () {
  chrome.omnibox.onInputChanged.addListener(this.onInputChanged.bind(this));
  chrome.omnibox.onInputEntered.addListener(this.onInputEntered.bind(this));
};

/**
 * Update the set of suggestions.
 */
Mercury.prototype.onInputChanged = function (text, suggest) {
  if (text) {
    // We don't bother updating for the empty string.
    this.lastSuggestions = new SuggestionRequest(this.getBookmarks(), text, suggest);
    this.lastSuggestions.run();
  }
};

/**
 * User picked a suggestion.  Open it in the current tab.
 */
Mercury.prototype.onInputEntered = function (text) {
  var last = this.lastSuggestions;
  if (last && text == last.rawText) {
    // Looks like the user picked the default suggestion.  In that
    // case we're given the raw input rather than the matching url
    // so we have to grab the url from the last suggestion.
    text = this.lastSuggestions.bestMatch.url;
  }
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.update(tab.id, {
      "url": text
    });
  });
};

function SuggestionRequest(bookmarks, text, suggest) {
  this.bookmarks = bookmarks;
  this.rawText = text;
  this.text = text.toLowerCase().split(" ");
  this.suggest = suggest;
  this.bestMatch = null;
}

function compareScores(one, two) {
  for (var i = 0; i < one.length; i++) {
    var diff = one[i] - two[i];
    if (diff != 0)
      return diff;
  }
  return 0;
}

function compareCandidates(one, two) {
  var scoreCmp = compareScores(one[0], two[0]);
  if (scoreCmp == 0) {
    var urlOne = one[1].url;
    var urlTwo = two[1].url;
    if (urlOne < urlTwo) {
      return -1;
    } else if (urlOne > urlTwo) {
      return 1;
    } else {
      return 0;
    }
  } else {
    return scoreCmp;
  }
}

SuggestionRequest.prototype.run = function () {
  var matches = [];
  var suggestions = [];
  for (var i = 0; i < this.bookmarks.length; i++) {
    var bookmark = this.bookmarks[i];
    var score = bookmark.getScore(this.text);
    if (score)
      matches.push([score, bookmark]);
  }
  matches.sort(compareCandidates);
  var suggests = [];
  for (var i = 1; i < matches.length; i++) {
    var bookmark = matches[i][1];
    suggests.push({
      'content': bookmark.url,
      'description': bookmark.getDescription()
    });
  }
  this.suggest(suggests);
  if (matches.length > 0) {
    this.bestMatch = matches[0][1];
    chrome.omnibox.setDefaultSuggestion({
      'description': this.bestMatch.getDescription()
    });
  }
};

function startMercury() {
  (new Mercury()).main();
}
