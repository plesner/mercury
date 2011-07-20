/**
 * A bookmark with a path (its parents as a list), a title and a target url.
 */
function Bookmark(path, pathNoCase, url) {
  /**
   * An ordered list of parent titles, starting at the top of the tree.
   */
  this.path = path;
  
  /**
   * The same as the 'path' field but with the case cleared.
   */
  this.pathNoCase = pathNoCase;

  /**
   * The URL of this bookmark.
   */
  this.url = url;
}

Bookmark.dropCase = function (str) {
  return str.toUpperCase();
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
  return this.path[i] + " - " + reversePath.join(" / ");
};

/**
 * Returns the list of strings that makes up this bookmark's path.
 */
Bookmark.prototype.getPath = function () {
  return this.path;
};

/**
 * Returns the list of strings that makes up this bookmark's path.
 */
Bookmark.prototype.getPathNoCase = function () {
  return this.pathNoCase;
};

/**
 * Returns a score vector of this bookmark agains the given input.
 */
Bookmark.prototype.getScore = function (input) {
  return Score.create(this.pathNoCase, input);
};

/**
 * Returns the title of this bookmark.
 */
Bookmark.prototype.getTitle = function () {
  return this.path[0];
};

/**
 * A single match between the input and a base, along with a score showing
 * the quality of the match.
 */
function Match(baseIndex, inputIndex, score) {
  this.baseIndex = baseIndex;
  this.inputIndex = inputIndex;
  this.score = score;
}

Match.prototype.getBaseIndex = function () {
  return this.baseIndex;
};

Match.prototype.getInputIndex = function () {
  return this.inputIndex;
};

Match.prototype.compareTo = function (that) {
  return this.score - that.score;
};

Match.prototype.getScore = function () {
  return this.score;
};

/**
 * Determines if the given needle occurs as a subsequence of the haystack,
 * returning a non-negative value if it does.  The smaller the score the
 * "better" it is, 0 meaning a perfect match.
 */
Match.getScore = function (haystack, needle) {
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

/**
 * Returns a mapping from needle characters to haystack characters that
 * identify where the overlap between them is.  This method _must_ work the
 * same way as Match.getScore.
 */
Match.getOverlapIndices = function (haystack, needle) {
  if (needle.length > haystack.length)
    return [];
  var cursor = 0;
  var mappings = [];
  for (var i = 0; i < needle.length; i++) {
    var next = needle[i];
    var match = haystack.indexOf(next, cursor);
    if (match == -1)
      return []
    mappings[i] = match;
    cursor = match + 1;
  }
  return mappings;
};

/**
 * Returns the same data as getOverlapIndices but as a list of overlap
 * regions, a list of pairs of [start, end] points of overlaps.
 */
Match.getOverlapRegions = function (haystack, needle) {
  var indices = Match.getOverlapIndices(haystack, needle);
  var regions = [];
  var currentStart = -2;
  var currentEnd = -2;
  indices.forEach(function (index) {
    if (index == currentEnd + 1) {
      currentEnd = index;
    } else {
      if (currentStart >= 0) {
        regions.push([currentStart, currentEnd]);
      }
      currentStart = index;
      currentEnd = index;
    }
  });
  if (currentStart >= 0) {
    regions.push([currentStart, currentEnd]);
  }
  return regions;
};

/**
 * A vector of matches that scores the input against a base.
 */
function Score(matches) {
  this.matches = matches;
}

/**
 * Compares two vectors of numbers lexicographically.
 */
Score.prototype.compareTo = function (that) {
  for (var i = 0; i < this.matches.length; i++) {
    var diff = this.matches[i].compareTo(that.matches[i]);
    if (diff != 0)
      return diff;
  }
  return 0;
};

/**
 * Returns the list of match objects.
 */
Score.prototype.getMatches = function () {
  return this.matches;
};

/**
 * For debugging.
 */
Score.prototype.toString = function () {
  return this.matches
      .map(function (match) { return match.getScore(); })
      .join(",")
};

/**
 * Compares two lists of words, returning a list of matches.  If the two lists
 * don't match null is returned.  We do this by basically matching each word
 * in the input with each word in the base.  If any word has no match we bail
 * out, and we only look for a match for the next input token after the first
 * match for the previous input token.
 *
 * Each resulting score in the returned list is the score of the two
 * corresponding matching strings, plus 1 for the distance in index between
 * where the matching strings occur.
 */
Score.create = function (base, input) {
  // Input is smaller than what we're matching it against.  Fail.
  if (base.length < input.length) {
    return null;
  }
  // Where was the first match of the last input token?
  var baseCursor = 0;
  var matches = [];
  // For each word in the input find the best match in the base.
  for (var i = 0; i < input.length; i++) {
    // Did anything match?
    var foundOne = false;
    // At which index was the first match of this token?
    var minMatch = Infinity;
    for (var j = baseCursor; j < base.length; j++) {
      var plainDist = Match.getScore(base[j], input[i]);
      if (plainDist >= 0) {
        // We have found a match.
        foundOne = true;
        // We penalize a match the further the words are apart.
        var newDist = plainDist + (j - i);
        matches.push(new Match(j, i, newDist));
        if (j < minMatch)
          minMatch = j;
      }
    }
    if (!foundOne) {
      return null;
    }
    baseCursor = minMatch + 1;
  }
  // Scan through the result and find the matching that occur earliest in the
  // input.
  var result = [];
  var next = 0;
  for (var i = 0; i < matches.length; i++) {
    if (matches[i].getInputIndex() == next) {
      result.push(matches[i]);
      next++;
    }
  }
  return new Score(result);
}

/**
 * A repository of bookmarks that keeps itself updated as the underlying
 * bookmarks change.
 */
function BookmarkRepository(chrome) {
  /**
   * Access to chrome.
   */
  this.chrome = chrome;

  /**
   * A list of bookmark objects.
   */
  this.bookmarks = [];

  /**
   * Have we already started reloading bookmarks?
   */
  this.isReloading = false;

  /**
   * These listeners want to be notified when the bookmarks change.
   */
  this.changeListeners = [];

  this.initialize();
}

/**
 * One-time setup to hook this into chrome's bookmark system.
 */
BookmarkRepository.prototype.initialize = function () {
  this.chrome.addBookmarkEventListener(this.reload.bind(this));
  this.reload();
};

/**
 * Adds a callback that will be called whenever the set of bookmarks change.
 */
BookmarkRepository.prototype.addChangeListener = function (callback) {
  this.changeListeners.push(callback);
};

/**
 * Invokes all the change listeners.
 */
BookmarkRepository.prototype.notifyChangeListeners = function () {
  for (var i = 0; i < this.changeListeners.length; i++) {
    var callback = this.changeListeners[i];
    callback(this);
  }
};

/**
 * Returns the current list of bookmarks.
 */
BookmarkRepository.prototype.getCurrent = function () {
  return this.bookmarks;
};

/**
 * Refresh the repository by reading bookmarks information from chrome.
 */
BookmarkRepository.prototype.reload = function () {
  if (this.isReloading)
    return;
  this.isReloading = true;
  this.chrome.getBookmarksTree(this.onFetched.bind(this));
};

/**
 * Update the set of bookmarks we know about to a new set fetched from chrome.
 */
BookmarkRepository.prototype.onFetched = function (tree) {
  this.bookmarks = [];
  for (var i = 0; i < tree.length; i++) {
    this.addBookmarks(tree[i], [], []);
  }
  this.isReloading = false;
  this.notifyChangeListeners();
};

var kTitleBlacklist = [
  "",
  Bookmark.dropCase("Bookmarks Bar"),
  Bookmark.dropCase("Other Bookmarks")
];

/**
 * Add the given bookmark tree node to the repository.
 */
BookmarkRepository.prototype.addBookmarks = function (node, path, pathNoCase) {
  var url = node.url;
  var title = node.title;
  var titleNoCase = Bookmark.dropCase(title);
  var newPath = [];
  var newPathNoCase = [];
  if (kTitleBlacklist.indexOf(titleNoCase) == -1) {
    newPath.push(title);
    newPathNoCase.push(titleNoCase);
  }
  for (var i = 0; i < path.length; i++) {
    newPath.push(path[i]);
    newPathNoCase.push(pathNoCase[i]);
  }
  if (url) {
    // We're at a bookmark, add it to the list.
    this.bookmarks.push(new Bookmark(newPath, newPathNoCase, url));
  } else {
    // We're at a folder, recursively add bookmarks.
    var children = node.children;
    for (var i = 0; i < children.length; i++)
      this.addBookmarks(children[i], newPath, newPathNoCase);
  }
};

/**
 * Main handler for this extension.
 */
function Mercury(chrome) {
  /**
   * Access to chrome.
   */
  this.chrome = chrome;
  
  /**
   * Repository of bookmarks that keeps itself updated when they change.
   */
  this.bookmarks = new BookmarkRepository(chrome);

  /**
   * The last suggestion we made which we'll use if the user selects the
   * default suggestion.
   */
  this.lastSuggestions = null;
}

/**
 * Returns the bookmark repository.
 */
Mercury.prototype.getBookmarks = function () {
  return this.bookmarks;
};

/**
 * Install ourselves through the appropriate chrome hooks.
 */
Mercury.prototype.install = function () {
  this.chrome.addOmniboxChangedListener(this.onInputChanged.bind(this));
  this.chrome.addOmniboxEnteredListener(this.onInputEntered.bind(this));
};

/**
 * Update the set of suggestions.
 */
Mercury.prototype.onInputChanged = function (text, suggest) {
  var suggests = this.fetchNextSuggestion(text);
  if (suggests.length > 0) {
    var best = suggests[0];
    var rest = [];
    for (var i = 1; i < suggests.length; i++)
      rest.push(suggests[i]);
    suggest(rest);
    this.chrome.setOmniboxDefaultSuggestion(best);
  }
};

/**
 * Calculate and return the next set of suggestions, updating the internal
 * state of this object.
 */
Mercury.prototype.fetchNextSuggestion = function (text) {
  if (text) {
    // We don't bother updating for the empty string.
    this.lastSuggestions = new SuggestionRequest(this.getBookmarks().getCurrent(), text);
    return this.lastSuggestions.run();
  } else {
    return [];
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
    text = this.lastSuggestions.bestMatch.getUrl();
  }
  this.chrome.updateCurrentTab({"url": text});
};

/**
 * Contains the stats associated with calculating a single set of suggestions.
 */
function SuggestionRequest(bookmarks, text) {
  /**
   * The set of bookmarks that was used to generate these suggestions.
   */
  this.bookmarks = bookmarks;

  /**
   * The raw input.  We don't base the suggestions on this but it can be used
   * to compare new inputs to.
   */
  this.rawText = text;
  
  /**
   * List of the words in the input.
   */
  this.text = Bookmark.dropCase(text).split(" ");
  
  /**
   * The best match, if we've found one.
   */
  this.bestMatch = null;
}

/**
 * Compares two candidates, first by score vector and if they're equal
 * alphabetically by URL.
 */
SuggestionRequest.compareCandidates = function (one, two) {
  var scoreCmp = one.getScore().compareTo(two.getScore());
  if (scoreCmp == 0) {
    var urlOne = one.getUrl();
    var urlTwo = two.getUrl();
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

/**
 * Returns a list of potential matches sorted by match quality.  The best
 * match is saved in a field for potential later use.
 */
SuggestionRequest.prototype.run = function () {
  var matches = [];
  var suggestions = [];
  for (var i = 0; i < this.bookmarks.length; i++) {
    var bookmark = this.bookmarks[i];
    var score = bookmark.getScore(this.text);
    if (score)
      matches.push(new Suggestion(bookmark, this.text, score));
  }
  matches.sort(SuggestionRequest.compareCandidates);
  if (matches.length > 0) {
    this.bestMatch = matches[0];
  }
  return matches;
};

/**
 * A single suggested result.
 */
function Suggestion(bookmark, text, score) {
  this.bookmark = bookmark;
  this.text = text;
  this.score = score;
}

/**
 * Formats the description of this suggestion using the specified formatting
 * controller function.  The controller is given the parts of the description
 * and functions that add a piece of the base string and a piece of raw text
 * to the end result, and is free to use those to construct the result however
 * it likes.
 */
Suggestion.prototype.formatDescription = function (doFormat) {
  // First make a mapping from base element to matches.
  var matches = this.score.getMatches();
  var mapping = [];
  matches.forEach(function (match) {
    mapping[match.getBaseIndex()] = match;
  });
  var text = "";
  var regions = [];
  var path = this.bookmark.getPath();
  var self = this;
  // Appends the given string which appears in the base at the given index to
  // the text, updating the regions appropriately.
  function addPart(part, i) {
    var match = mapping[i];
    var startOffset = text.length;
    text += part;
    // There was a match on this part of the input so we have to highlight
    // the overlap.
    if (match != null) {
      var inputPart = self.text[match.getInputIndex()];
      var partNoCase = Bookmark.dropCase(part);
      Match.getOverlapRegions(partNoCase, inputPart).forEach(function (region) {
        var start = region[0] + startOffset;
        var end = region[1] + startOffset;
        regions.push([start, end])
      });
    }
  }
  function addText(value) {
    text += value;
  }
  doFormat(path, addPart, addText);
  return new Markup(text, regions);
};

/**
 * Returns a marked up description of this suggestion suitable to be displayed
 * in the omnibox.
 */
Suggestion.prototype.getDescription = function () {
  return this.formatDescription(function (path, addPart, addText) {
    addPart(path[0], 0);
    addText(" - ");
    for (var i = path.length - 1; i > 0; i--) {
      addPart(path[i], i);
      if (i > 1)
        addText(" / ");
    }
  });
};

/**
 * Returns a simple description useful for testing.
 */
Suggestion.prototype.getSimpleDescription = function () {
  return this.formatDescription(function (path, addPart, addText) {
    for (var i = 0; i < path.length; i++) {
      if (i > 0)
        addText(" ");
      addPart(path[i], i);
    }
  });
};

/**
 * Returns the score vector this suggestion received.
 */
Suggestion.prototype.getScore = function () {
  return this.score;
};

/**
 * Returns the url to go to for this suggestion.
 */
Suggestion.prototype.getUrl = function () {
  return this.bookmark.url;
};

/**
 * Returns a suggest result describing this suggestion suitable to be consumed
 * by a suggest callback.
 */
Suggestion.prototype.asSuggestResult = function () {
  return {
    'content': this.getUrl(),
    'description': this.getDescription().toXml()
  };
};

/**
 * Returns a default suggestion suitable to be used by the omnibox.
 */
Suggestion.prototype.asDefaultSuggestion = function () {
  return {
    'description': this.getDescription().toXml()
  };
};

/**
 * For debugging.
 */
Suggestion.prototype.toString = function () {
  return "#<a Suggestion: " + this.text + "@" + this.score + ">";
};

/**
 * A piece of text along with some formatting instructions.
 */
function Markup(text, regions) {
  /**
   * The raw text.
   */
  this.text = text;
  
  /**
   * The regions where this text should be highlighted.
   */
  this.regions = regions;
}

/**
 * Escape a description so it can be displayed by chrome.
 */
Markup.escape = function (str) {
  return str.replace(/&/g, "&amp;");
}

/**
 * For debugging.
 */
Markup.prototype.toString = function () {
  return this.mapParts(function (part, isMarkedUp) {
    return isMarkedUp ? "[" + part + "]" : part;
  }).join("");
};

/**
 * Formats this markup as omnibox compatible markup.
 */
Markup.prototype.toXml = function () {
  return this.mapParts(function (part, isMarkedUp) {
    var escaped = Markup.escape(part);
    if (isMarkedUp) {
      return "<match>" + escaped + "</match>";
    } else {
      return "<dim>" + escaped + "</dim>";
    }
  }).join("");
};

/**
 * Invokes the callback for each part of this text, passing the part and a
 * boolean indicating whether this part is marked up or not.
 */
Markup.prototype.forEachPart = function (callback) {
  var text = this.text;
  var index = 0;
  this.regions.forEach(function (region) {
    var start = region[0];
    var end = region[1];
    if (index < start) {
      callback(text.substring(index, start), false);
    }
    callback(text.substring(start, end + 1), true);
    index = end + 1;
  });
  if (index < text.length) {
    callback(text.substring(index, text.length));
  }
};

Markup.prototype.mapParts = function (callback) {
  var result = [];
  this.forEachPart(function (part, isMarkedUp) {
    result.push(callback(part, isMarkedUp));
  });
  return result;
}

/**
 * Object that encapsulates interactions with chrome.  We use one when
 * running within chrome and another for testing.
 */
function Chrome() { }

/**
 * Adds a listener that gets notified when the input in the omnibox changes.
 */
Chrome.prototype.addOmniboxChangedListener = function (listener) {
  chrome.omnibox.onInputChanged.addListener(function (value, rawSuggest) {
    listener(value, function (suggests) {
      rawSuggest(suggests.map(function (suggest) {
        return suggest.asSuggestResult();
      }));
    });
  });
};

/**
 * Adds a listener that gets notified when a value is selected in the
 * omnibox.
 */
Chrome.prototype.addOmniboxEnteredListener = function (listener) {
  chrome.omnibox.onInputEntered.addListener(listener);
};

/**
 * Sets the default suggestion in the omnibox.
 */
Chrome.prototype.setOmniboxDefaultSuggestion = function (value) {
  chrome.omnibox.setDefaultSuggestion(value.asDefaultSuggestion());
};

/**
 * Adds a listener that is notified of all changes to bookmarks.
 */
Chrome.prototype.addBookmarkEventListener = function (listener) {
  chrome.bookmarks.onChanged.addListener(listener);
  chrome.bookmarks.onCreated.addListener(listener);
  chrome.bookmarks.onRemoved.addListener(listener);
};

/**
 * Starts chrome fetching bookmarks, calling back the given callback when
 * complete.
 */
Chrome.prototype.getBookmarksTree = function (callback) {
  chrome.bookmarks.getTree(callback);
};

/**
 * Schedules the current tab to be updated with the given update.
 */
Chrome.prototype.updateCurrentTab = function (update) {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.update(tab.id, update);
  });  
};

function installMercury() {
  (new Mercury(new Chrome())).install();
}
