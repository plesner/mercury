/**
 * A bookmark with a path (its parents as a list), a title and a target url.
 */
function Bookmark(title, url, parent) {
  /**
   * The title of this bookmark.
   */
  this.title = title;
  
  /**
   * Cache of the title with case cleared.
   */
  this.titleNoCase = null;
  
  /**
   * The URL of this bookmark.
   */
  this.url = url;
  
  /**
   * The folder that contains this bookmark.
   */
  this.parent = parent;
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
  var result = [];
  var current = this;
  while (current != null) {
    result.push(current.getTitle());
    current = current.getParent();
  }
  return result;
};

/**
 * Returns a score vector of this bookmark agains the given input.
 */
Bookmark.prototype.getScore = function (input) {
  return Score.create(this.title, input);
};

/**
 * Returns the title of this bookmark.
 */
Bookmark.prototype.getTitle = function () {
  return this.title;
};

/**
 * Returns this bookmark's url.
 */
Bookmark.prototype.getUrl = function () {
  return this.url;
};

/**
 * Returns the folder containing this bookmark.
 */
Bookmark.prototype.getParent = function () {
  return this.parent;
}

/**
 * A bookmark folder, used to retain the structure of the bookmarks.
 */
function BookmarkFolder(title, parent) {
  /**
   * This folder's title or label.
   */
  this.title = title;

  /**
   * The parent folder, or null for root folders.
   */
  this.parent = parent;
}

/**
 * Returns this folder's title.
 */
BookmarkFolder.prototype.getTitle = function () {
  return this.title;
};

/**
 * Returns this folder's parent, or null if this is a root folder.
 */
BookmarkFolder.prototype.getParent = function () {
  return this.parent;
};

/**
 * A score we got from comparing two strings.
 */
function Score(score, matches) {
  /**
   * The score value.
   */
  this.score = score;
  
  /**
   * An array of match indices.
   */
  this.matches = matches;
}

/**
 * Returns the match ranges of this score.
 */
Score.prototype.getMatches = function () {
  return this.matches;
};

Score.prototype.compareTo = function (other) {
  return other.score - this.score;
};

/**
 * Returns the score value.
 */
Score.prototype.getScore = function () {
  return this.score;
};

/**
 * Is the given character a white space?
 */
Score.isWhiteSpace = function (chr) {
  return /\s/.test(chr);
};

/**
 * Is the given character in upper case?
 */
Score.isUpperCase = function (chr) {
  return chr.toUpperCase() == chr;
};

/**
 * Returns a score between 0 and 1 specifying how good a match the
 * abbreviation is for the given string.
 *
 * A port of the quicksilver string scoring algorithm with a few improvements
 * to the implementation but not the algorithm.  The original is
 * scoreForAbbreviation in
 * http://blacktree-alchemy.googlecode.com/svn/trunk/Crucible/Code/NSString_BLTRExtensions.m.
 */
Score.getScoreHelper = function (string, stringNoCase, offset, abbrev, matches) {
  if (abbrev.length == 0) {
    // Matching the empty string against anything yields a match but not
    // a perfect one.
    return 0.9;
  } else if (abbrev.length > (string.length - offset)) {
    // Abbreviation is longer than the string so it definitely can't match.  
    return 0.0;
  }
  // The more of the abbreviation we can match in one block the better, so we
  // start with the best possible option, everything, and lower our
  // expectations gradually.
  for (var i = abbrev.length; i > 0; i--) {
    var abbrevPart = abbrev.substring(0, i);
    var matchStartOffset = stringNoCase.indexOf(abbrevPart, offset);
    if (matchStartOffset == -1) {
      // We didn't find a match.  Okay, we were too ambitious -- retry with
      // the next smaller substring.
      continue;
    }
    var matchEndOffset = matchStartOffset + i;
    var nextAbbrev = abbrev.substring(i);
    // Score the remaining abbreviation in the rest of the string.  If it
    // doesn't match then there's no reason to do the extra work associated
    // with scoring and recording a match.
    var remainingScore = Score.getScoreHelper(string, stringNoCase,
        matchEndOffset, nextAbbrev, matches);
    if (remainingScore == 0.0) {
      // We found a match but the rest didn't.  So again we have to retry
      // with a smaller substring.
      continue;
    }
    // We're going to score the result by giving each character this substring
    // is responsible for (matching or skipping) a value and then dividing the
    // result by how big a fraction of the whole string those characters are.
    // We start out by giving each character a penalty of 0 and then working
    // from there.
    var penalty = 0;
    // If we skipped some letters then we'll probably want to penalize those
    // characters but we have to check if there are any skipped character
    // we want to allow with a lower penalty.
    if (matchStartOffset > offset) {
      if (Score.isWhiteSpace(string.charAt(matchStartOffset - 1))) {
        // The character preceding the match is a whitespace, which is fine;
        // abbreviations can match multiple words.  But we'll still penalize
        // any non-witespace characters a bit, and any other spaces will be
        // penalized fully because they mean we've skipped whole words.
        for (var j = matchStartOffset - 2; j >= offset; j--) {
          penalty += Score.isWhiteSpace(string.charAt(j)) ? 1.0 : 0.15;
        }
      } else if (Score.isUpperCase(string.charAt(matchStartOffset))) {
        // The first character of the match is in upper case.  That's fine,
        // abbreviations or start letters are often in upper case, but any
        // other letters we've skipped will be penalized a little and any
        // other upper case letters we've skipped will get the full penalty
        // because we've skipped previous abbreviation or camel case words.
        for (var j = matchStartOffset - 1; j >= offset; j--) {
          penalty += Score.isUpperCase(string.charAt(j)) ? 1.0 : 0.15;
        }
      } else {
        // There's nothing special so just penalize all skipped characters
        // to the full extent of the law.
        penalty += matchStartOffset - offset;
      }
    }
    // If there is a matches list we push the current match.  Doing this after
    // the recursive call means that the list will be reversed, but it is
    // cheaper to wait until we're sure there is a match.
    if (matches) {
      matches.push([matchStartOffset, matchEndOffset - 1]);
    }
    // Starting from each character getting 1.0 and then subtracting the
    // penalty we get the summed points for this match's substring.
    var partPoints = (matchEndOffset - offset) - penalty;
    // Then multiplying the remaining score with the remaining length of the
    // string we get the summed points for the rest of the string.
    var remainingPoints = remainingScore * (string.length - matchEndOffset);
    // Then the score is the sum of all the points divided by the number
    // of characters in all the string we've matched against.
    return (partPoints + remainingPoints) / (string.length - offset);
  }
  return 0.0;
};

/**
 * Calculates the score between 0.0 and 1.0 of how well the given abbreviation
 * matches the given string.  If an array of matches is given the points where
 * the match was found will be pushed onto the array in reverse order.
 */
Score.getScore = function (string, abbrev, matchesOpt) {
  return Score.getScoreHelper(string, Bookmark.dropCase(string), 0,
      Bookmark.dropCase(abbrev), matchesOpt);
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
  var matches = [];
  var score = Score.getScore(base, input, matches);
  if (score == 0.0) {
    return null;
  } else {
    return new Score(score, matches.reverse())
  }
};

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
    this.addBookmarks(tree[i], null, 0);
  }
  this.isReloading = false;
  this.notifyChangeListeners();
};

/**
 * Add the given bookmark tree node to the repository.
 */
BookmarkRepository.prototype.addBookmarks = function (node, parent, depth) {
  var url = node.url;
  var title = node.title;
  if (url) {
    // We're at a bookmark, add it to the list.
    this.bookmarks.push(new Bookmark(title, url, parent));
  } else {
    // We skip folders at level 0 (the root) and 1 (the built-in ones).
    var newParent = (depth < 2) ? parent : new BookmarkFolder(title, parent);
    // We're at a folder, recursively add bookmarks.
    var children = node.children;
    for (var i = 0; i < children.length; i++)
      this.addBookmarks(children[i], newParent, depth + 1);
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
    this.lastSuggestions.defaultSuggestion.execute(this.chrome);
  } else {
    this.chrome.updateCurrentTab({"url": text});
  }
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
  var inputLists = Parser.parse(text).expand(bookmarks);
  this.inputs = inputLists.map(function (list) { return list.join(" "); });
  
  /**
   * The default suggection for when the user just presses enter rather than
   * select an item in the list.
   */
  this.defaultAction = null;
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
  if (this.inputs.length == 1) {
    return this.runSingle(this.inputs[0]);
  } else  {
    return this.runMultiple(this.inputs);
  }
};

SuggestionRequest.prototype.getAllMatches = function (parts) {
  var matches = [];
  var suggestions = [];
  for (var i = 0; i < this.bookmarks.length; i++) {
    var bookmark = this.bookmarks[i];
    var score = bookmark.getScore(parts);
    if (score)
      matches.push(new SingleSuggestion(bookmark, parts, score));
  }
  matches.sort(SuggestionRequest.compareCandidates);
  return matches;
}

SuggestionRequest.prototype.runSingle = function (parts) {
  var matches = this.getAllMatches(parts);
  if (matches.length > 0) {
    this.defaultSuggestion = matches[0];
  }
  return matches;
};

SuggestionRequest.prototype.runMultiple = function (inputList) {
  var bestMatches = [];
  inputList.forEach(function (input) {
    var matches = this.getAllMatches(input);
    if (matches.length > 0) {
      bestMatches.push(matches[0]);
    }
  }.bind(this));
  if (bestMatches.length == 0) {
    return [];
  } else if (bestMatches.length == 1) {
    this.defaultSuggestion = bestMatches[0];
    return bestMatches;
  } else {
    this.defaultSuggestion = new CompoundSuggestion(bestMatches);
    return [this.defaultSuggestion];
  }
};

/**
 * A union of multiple tokens.
 */
function ForEach(parts) {
  /**
   * The individual parts that make up this conjunction.
   */
  this.parts = parts;
}

/**
 * Returns a plain-old-JS-object for this value for testing.
 */
ForEach.prototype.toPojso = function () {
  return this.parts.map(function (part) { return part.toPojso(); });
};

/**
 * Expands by simply joining together the matches for each of its subparts.
 */
ForEach.prototype.expand = function (bookmarks) {
  var result = [];
  this.parts.forEach(function (part) {
    result = result.concat(part.expand(bookmarks));
  });
  return result;
};

/**
 * Creates a new ForEach for the given set of parts if necessary.  If there is
 * only one part just returning that part is equivalent.
 */
ForEach.create = function (parts) {
  if (parts.length == 1) {
    return parts[0];
  } else {
    return new ForEach(parts);
  }
};

/**
 * A number of parts in sequence.
 */
function Sequence(parts) {
  /**
   * The parts that make up this sequence.
   */
  this.parts = parts;
}

/**
 * Returns a plain-old-JS-object for this value for testing.
 */
Sequence.prototype.toPojso = function () {
  return this.parts.map(function (part) { return part.toPojso(); });
};

function cloneList(list) {
  return list.map(function (e) { return e; });
}

/**
 * Expands a sequence by successively "multiplying" the current set of
 * matches with the new sets of submatches.
 */
Sequence.prototype.expand = function (bookmarks) {
  // We start out with a single empty match.
  var results = [[]];
  this.parts.forEach(function (part) {
    // First we expand the part on its own.
    var expanded = part.expand(bookmarks);
    var newResults = [];
    // Then for each element in the previous results...
    results.forEach(function (result) {
      // ...we create a copy for each of the subparts matches and add its
      // matches on the end.
      expanded.forEach(function (part) {
        var clone = cloneList(result);
        newResults.push(clone.concat(part));
      });
    });
    results = newResults;
  });
  return results;
};

/**
 * Returns a sequence of the given parts.  If there is only one part just
 * returning that part is equivalent.
 */
Sequence.create = function (parts) {
  if (parts.length == 1) {
    return parts[0];
  } else {
    return new Sequence(parts);
  }
};

/**
 * A match against a single word token.
 */
function WordMatch(token) {
  this.token = token;
}

/**
 * Returns a plain-old-JS-object for this value for testing.
 */
WordMatch.prototype.toPojso = function () {
  return this.token;
};

/**
 * Returns a list of queries, each of which is itself a list of strings.  In
 * this case there is a single query which has a single string.
 */
WordMatch.prototype.expand = function () {
  return [[this.token]];
};

/**
 * A variable that resolves to the value of another bookmark.
 */
function Variable(name) {
  this.name = name;
}

/**
 * Creates a variable object or, if the name would not work for a variable,
 * a word match.
 */
Variable.create = function (name) {
  if (!name) {
    return new WordMatch("$");
  } else {
    return new Variable(name);
  }
}

Variable.prototype.toPojso = function () {
  return ["$", this.name];
};

Variable.parseUrl = function (url) {
  var match = /set:\/\/(.*)/i.exec(url);
  if (!match) {
    return null;
  } else {
    var parts = match[1].split("/");
    var result = [];
    parts.forEach(function (part) {
      if (part)
        result.push(Bookmark.dropCase(part));
    });
    return result;
  }
}

Variable.prototype.expand = function (bookmarks) {
  var result = null;
  var name = this.name;
  bookmarks.forEach(function (bookmark) {
    if (Bookmark.dropCase(bookmark.getTitle()) == name)
      result = bookmark;
  });
  if (result == null) {
    return [["$" + this.name]];
  } else {
    var values = Variable.parseUrl(result.getUrl());
    if (values == null) {
      return [["$" + this.name]];
    } else {
      return values.map(function (value) { return [value]});
    }
  }
};

/**
 * Input string tokenizer.
 */
function Scanner(input) {
  /**
   * The input string.
   */
  this.input = input;
  
  /**
   * How far into the input are we?
   */
  this.cursor = 0;
  
  this.skipSpaces();
}

/**
 * Returns the current character as a string, return the empty string when
 * there is no more input.
 */
Scanner.prototype.getCurrent = function () {
  return this.input.charAt(this.cursor);
};

/**
 * Move ahead to the next character.
 */
Scanner.prototype.advance = function () {
  this.cursor++;
};

/**
 * Are there any more characters in this string?
 */
Scanner.prototype.hasMore = function () {
  return this.cursor < this.input.length;
};

/**
 * Skips over any space characters.
 */
Scanner.prototype.skipSpaces = function () {
  while (this.hasMore() && Scanner.isSpace(this.getCurrent()))
    this.advance();
};

/**
 * Is this a special delimiter character?
 */
Scanner.isDelimiter = function (chr) {
  return "{},$".indexOf(chr) != -1;
};

Scanner.isSpace = function (chr) {
  return /\s/.test(chr);
};

Scanner.isWord = function (chr) {
  return !Scanner.isDelimiter(chr) && !Scanner.isSpace(chr);
}

/**
 * Returns the next token.
 */
Scanner.prototype.scanToken = function () {
  var current = this.getCurrent();
  if (Scanner.isDelimiter(current)) {
    this.advance();
    this.skipSpaces();
    return current;
  } else {
    return this.scanWord();
  }
};

/**
 * Scans and returns the next non-delimiter token.
 */
Scanner.prototype.scanWord = function () {
  var result = "";
  var current = this.getCurrent();
  while (this.hasMore() && Scanner.isWord(current)) {
    result += current;
    this.advance();
    current = this.getCurrent();
  }
  this.skipSpaces();
  return result;
};

/**
 * Splits the given string into a list of tokens.
 */
Scanner.scan = function (str) {
  var scanner = new Scanner(str);
  var tokens = [];
  while (scanner.hasMore()) {
    var token = scanner.scanToken();
    tokens.push(Bookmark.dropCase(token));
  }
  return tokens;
};

/**
 * Parses a list of tokens into an action expression.
 */
function Parser(tokens) {
  /**
   * The pre-scanned input tokens.
   */
  this.tokens = tokens;
  
  /**
   * How far into the tokens are we?
   */
  this.cursor = 0;
}

/**
 * Returns the current token.
 */
Parser.prototype.getCurrent = function () {
  return this.tokens[this.cursor];
};

/**
 * Skip ahead to the next token.
 */
Parser.prototype.advance = function () {
  this.cursor++;
};

/**
 * Are there more tokens?
 */
Parser.prototype.hasMore = function () {
  return this.cursor < this.tokens.length;
};

/**
 * Parses a toplevel expression.
 */
Parser.prototype.parseExpression = function () {
  return this.parseSequence();
};

/**
 * Parses a sequence expression.
 */
Parser.prototype.parseSequence = function () {
  var parts = [];
  while (this.hasMore()) {
    var token = this.getCurrent();
    if (token == "{") {
      this.advance();
      parts.push(this.parseForEach());
    } else if (token == "$") {
      this.advance();
      var name = this.getCurrent();
      parts.push(Variable.create(name));
      this.advance();
    } else if (token == "}" || token == ",") {
      break;
    } else {
      var word = new WordMatch(token);
      parts.push(word);
      this.advance();
    }
  }
  return Sequence.create(parts);
};

/**
 * Parses a group of the form {a, b, c}.
 */
Parser.prototype.parseForEach = function () {
  var parts = [];
  while (this.hasMore()) {
    var current = this.getCurrent();
    if (current == "}") {
      this.advance();
      break;
    } else {
      var part = this.parseSequence();
      parts.push(part);
      current = this.getCurrent();
      if (current == ",") {
        this.advance();
        continue;
      } else if (current == "}") {
        this.advance();
        break;
      } else {
        break;
      }
    }
  }
  return ForEach.create(parts);
};

Parser.isDelimiter = function (word) {
  if (word.length > 1) {
    return false;
  } else {
    return Scanner.isDelimiter(word);
  }
}

Parser.parse = function (input) {
  var tokens = Scanner.scan(input);
  if (tokens.length == 0) {
    return null;
  }
  var parser = new Parser(tokens);
  return parser.parseSequence();
}

/**
 * A single suggested result.
 */
function SingleSuggestion(bookmark, text, score) {
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
SingleSuggestion.prototype.formatDescription = function (doFormat) {
  // First make a mapping from base element to matches.
  var text = "";
  var regions = [];
  var self = this;
  // Appends the given string which appears in the base at the given index to
  // the text, updating the regions appropriately.
  function addTitle() {
    var offset = text.length;
    self.score.getMatches().forEach(function (match) {
      regions.push([offset + match[0], offset + match[1]]);
    });
    text += self.bookmark.getTitle();
  }
  function addText(value) {
    text += value;
  }
  doFormat(this.bookmark.getPath(), addTitle, addText);
  return new Markup(text, regions);
};

/**
 * Returns a marked up description of this suggestion suitable to be displayed
 * in the omnibox.
 */
SingleSuggestion.prototype.getDescription = function () {
  return this.formatDescription(function (path, addTitle, addText) {
    addTitle();
    addText(" - ");
    for (var i = path.length - 1; i > 0; i--) {
      addText(path[i]);
      if (i > 1)
        addText(" / ");
    }
  });
};

/**
 * Returns a simple description useful for testing.
 */
SingleSuggestion.prototype.getSimpleDescription = function () {
  return this.formatDescription(function (path, addTitle, addText) {
    addTitle();
    for (var i = 1; i < path.length; i++)
      addText(" " + path[i]);
  });
};

SingleSuggestion.prototype.getTitle = function () {
  return this.formatDescription(function (path, addTitle, addText) {
    addTitle();
  });
}

/**
 * Returns the score vector this suggestion received.
 */
SingleSuggestion.prototype.getScore = function () {
  return this.score;
};

/**
 * Returns the url to go to for this suggestion.
 */
SingleSuggestion.prototype.getUrl = function () {
  return this.bookmark.getUrl();
};

/**
 * Returns a suggest result describing this suggestion suitable to be consumed
 * by a suggest callback.
 */
SingleSuggestion.prototype.asSuggestResult = function () {
  return {
    'content': this.getUrl(),
    'description': this.getDescription().toXml()
  };
};

/**
 * Returns a default suggestion suitable to be used by the omnibox.
 */
SingleSuggestion.prototype.asDefaultSuggestion = function () {
  return {
    'description': this.getDescription().toXml()
  };
};

/**
 * For debugging.
 */
SingleSuggestion.prototype.toString = function () {
  return "#<a SingleSuggestion: " + this.text + "@" + this.score + ">";
};

/**
 * Executes the action for when this suggestion is selected.
 */
SingleSuggestion.prototype.execute = function (chrome) {
  chrome.updateCurrentTab({'url': this.getUrl()});
};

/**
 * A suggestion which opens multiple urls in multiple tabs.
 */
function CompoundSuggestion(children) {
  this.children = children;
}

/**
 * The score is not well-defined so we just return a dummy value.
 */
CompoundSuggestion.prototype.getScore = function () {
  return "*";
};

/**
 * Returns this as a default suggestion.  Compound suggestions don't work as
 * suggest results.
 */
CompoundSuggestion.prototype.asDefaultSuggestion = function () {
  return {
    'description': this.getDescription().toXml()
  };
};

/**
 * Returns the description to use of this suggestion.
 */
CompoundSuggestion.prototype.getDescription = function () {
  return new CompoundDescription(this.children);
};

CompoundSuggestion.prototype.execute = function (chrome) {
  var urls = this.children.map(function (child) { return child.getUrl(); });
  // Update the current tab to hold the first of the urls.
  chrome.updateCurrentTab({'url': urls[0]});
  chrome.getCurrentTabIndex(function (index) {
    // Then open tabs for the remaining ones.  We do it in reverse order since
    // each new one will push the older ones further away from the current tab.
    for (var i = urls.length - 1; i > 0; i--) {
      chrome.openNewTab({
        'url': urls[i],
        'index': index + 1,
        'selected': false
      });
    }
  });
};

/**
 * A description which is made up of multiple child descriptions.
 */
function CompoundDescription(children) {
  this.children = children;
}

CompoundDescription.prototype.formatDescription = function (childFormatter) {
  var children = this.children;
  var result = ["Open " + children.length + " tab"];
  if (children.length > 1)
     result.push("s");
  result.push(" with ");
  children.map(function (child, i) {
    if (i > 0) {
      if (i == children.length - 1) {
        result.push(" and ");
      } else {
        result.push(", ");
      }
    }
    result.push(childFormatter(child));
  });
  return result.join("");
};

CompoundDescription.prototype.toString = function () {
  return this.formatDescription(function (child) {
    return child.getTitle().toString();
  });
};

CompoundDescription.prototype.toXml = function () {
  return this.formatDescription(function (child) {
    return child.getTitle().toXml();
  });
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

Chrome.prototype.openNewTab = function (properties) {
  chrome.tabs.create(properties);
};

Chrome.prototype.getCurrentTabIndex = function (callback) {
  chrome.tabs.getSelected(null, function (tab) {
    callback(tab.index);
  });
};

function installMercury() {
  (new Mercury(new Chrome())).install();
}
