String.prototype.startsWith = function (substr) {
  if (this.length < substr.length) {
    return false;
  } else {
    return this.substring(0, substr.length) == substr;
  }
};

function assertTrue(cond) {
  if (!cond) {
    FAIL;
  }
}

function assertEquals(a, b) {
  if (a != b) {
    failComparison(a, b);
  }
}

function failComparison(a, b) {
  throw "Error: " + a + " != " + b;
}

function compareLists(one, two) {
  if (one == two)
    return true;
  if (Array.isArray(one) != Array.isArray(two))
    return false;
  if (one.length != two.length)
    return false;
  for (var i = 0; i < one.length; i++) {
    var vOne = one[i];
    var vTwo = two[i];
    if (Array.isArray(vOne) && Array.isArray(vTwo)) {
      if (!compareLists(vOne, vTwo))
        return false;
    } else if (one[i] != two[i]) {
      return false;
    }
  }
  return true
}

function assertListEquals(one, two) {
  if (!compareLists(one, two)) {
    failComparison(listToString(one), listToString(two));
  }
}

function listToString(obj) {
  if (Array.isArray(obj)) {
    return "[" + obj.map(listToString).join(", ") + "]"
  } else {
    return String(obj);
  }
}

function getMatchRanges(a, b) {
  var score = Score.create(a, b);
  if (score == null) {
    return null;
  } else {
    return score.getMatches()
  }
}

function testMatchRanges() {
  assertListEquals(getMatchRanges("foo bar baz", "ar az"), [[5, 7], [9, 10]]);
  assertListEquals(getMatchRanges("foo bar baz", "az"), [[9, 10]]);
  assertListEquals(getMatchRanges("foo bar baz", "foo bar baz"), [[0, 10]]);
  assertListEquals(getMatchRanges("foo foo", "foo"), [[0, 2]]);
  assertListEquals(getMatchRanges("foo bar baz", "xxx"), null);
  assertListEquals(getMatchRanges("abcdefg", "abcdefg"), [[0, 6]]);
  assertListEquals(getMatchRanges("abcdefg", "abcdef"), [[0, 5]]);
  assertListEquals(getMatchRanges("abcdefg", "abcde"), [[0, 4]]);
  assertListEquals(getMatchRanges("abcdefg", "abde"), [[0, 1], [3, 4]]);
  assertListEquals(getMatchRanges("abcdefg", "a"), [[0, 0]]);
  assertListEquals(getMatchRanges("abcdefg", "cd"), [[2, 3]]);
  assertListEquals(getMatchRanges("abcdefg", "fg"), [[5, 6]]);
  assertListEquals(getMatchRanges("abcdefg", "abd"), [[0, 1], [3, 3]]);
  assertListEquals(getMatchRanges("abcdefg", "abe"), [[0, 1], [4, 4]]);
  assertListEquals(getMatchRanges("abcdefg", "acd"), [[0, 0], [2, 3]]);
  assertListEquals(getMatchRanges("abcdefg", "ade"), [[0, 0], [3, 4]]);
  assertListEquals(getMatchRanges("abcdefg", "ag"), [[0, 0], [6, 6]]);
  assertListEquals(getMatchRanges("abcdefg", "x"), null);
  assertListEquals(getMatchRanges("mmmm", "m"), [[0, 0]]);
  assertListEquals(getMatchRanges("mmmm", "mm"), [[0, 1]]);
  assertListEquals(getMatchRanges("mmmm", "mmm"), [[0, 2]]);
  assertListEquals(getMatchRanges("mmmm", "mmmm"), [[0, 3]]);
}

function getMatchScore(a, b) {
  var score = Score.create(a, b);
  if (score == null) {
    return 0;
  } else {
    return score.getScore()
  }
}

function testMatchScore() {
  assertEquals(getMatchScore("abcdefg", "abcdefg"), 1.0);
  assertTrue(getMatchScore("abcdefg", "abcdef") < getMatchScore("abcdefg", "abcdefg"));
  assertTrue(getMatchScore("abcdefg", "abcde") < getMatchScore("abcdefg", "abcdef"));
  assertTrue(getMatchScore("abcdefg", "abcd") < getMatchScore("abcdefg", "abcde"));
  assertTrue(getMatchScore("abcdefg", "abc") < getMatchScore("abcdefg", "abcd"));
  assertTrue(getMatchScore("abcdefg", "ab") < getMatchScore("abcdefg", "abc"));
  assertTrue(getMatchScore("abcdefg", "a") < getMatchScore("abcdefg", "ab"));
  assertEquals(getMatchScore("ab cd e", "abcde"), 1.0);
  assertTrue(getMatchScore("abncd e", "abcde") < 1.0);
  assertEquals(getMatchScore("abcdefg", "x"), 0.0);
}

function testGetOverlapRegions() {
}

/**
 * Matches the input with the base string and returns the simple description
 * string of the result.
 */
function getMatchString(base, input) {
  var bookmark = new Bookmark([base], "<url>");
  var request = new SuggestionRequest([bookmark], input);
  var matches = request.run();
  assertEquals(1, matches.length);
  var match = matches[0];
  return match.getSimpleDescription().toString();
}

function testSimpleMatch() {
  assertEquals(getMatchString("foo bar", "f b"), "[f]oo[ b]ar");
  assertEquals(getMatchString("foo fox", "fo fx"), "[fo]o[ f]o[x]");
  assertEquals(getMatchString("foo bar baz", "ar az"), "foo b[ar ]b[az]");
  assertEquals(getMatchString("summary", "summ"), "[summ]ary");
}

function runScannerTest(input, expected) {
  var tokens = Scanner.scan(input);
  var expectedTokens = expected.map(Bookmark.dropCase);
  assertListEquals(expectedTokens, tokens);
}

function testScanner() {
  runScannerTest("", []);
  runScannerTest(" ", []);
  runScannerTest("foo bar baz", ["foo", "bar", "baz"]);
  runScannerTest(" foo  bar  baz ", ["foo", "bar", "baz"]);
  runScannerTest("  foo   bar   baz  ", ["foo", "bar", "baz"]);
  runScannerTest("{a}{b}", ["{", "a", "}", "{", "b", "}"])
  runScannerTest(" { a } { b } ", ["{", "a", "}", "{", "b", "}"])
  runScannerTest("{{a}{b}}", ["{", "{", "a", "}", "{", "b", "}", "}"])
  runScannerTest("foo{,$}bar", ["foo", "{", ",", "$", "}", "bar"])
}

function mapRecursive(obj, fun) {
  if (Array.isArray(obj)) {
    return obj.map(function (elm) {
      return mapRecursive(elm, fun);
    });
  } else {
    return fun(obj);
  }
}

function runParserTest(input, expected) {
  var parsed = Parser.parse(input);
  var expectedTree = mapRecursive(expected, Bookmark.dropCase);
  assertListEquals(expectedTree, parsed.toPojso());
}

function testParserGrouping() {
  runParserTest("foo bar baz", ["foo", "bar", "baz"]);
  runParserTest("foo", ["foo"]);
  runParserTest("foo {bar baz}", ["foo", ["bar", "baz"]]);
  runParserTest("foo {bar, baz}", ["foo", ["bar", "baz"]]);
  runParserTest("foo {bar baz, quux}", ["foo", [["bar", "baz"], "quux"]]);
  runParserTest("foo {bar {baz}}", ["foo", ["bar", ["baz"]]]);
  runParserTest("foo {bar {baz} quux}", ["foo", ["bar", ["baz"], "quux"]]);
  runParserTest("foo {bar {baz, zoom} quux}", ["foo", ["bar", ["baz", "zoom"], "quux"]]);
}

function runExpansionTest(input, expected) {
  var parsed = Parser.parse(input);
  var expectedTree = mapRecursive(expected, Bookmark.dropCase);
  assertListEquals(expectedTree, parsed.expand());
}

function testParserExpansion() {
  runExpansionTest("foo", [["foo"]]);
  runExpansionTest("foo bar baz", [["foo", "bar", "baz"]]);
  runExpansionTest("foo {bar, baz}", [["foo", "bar"], ["foo", "baz"]]);
  runExpansionTest("{a, b} {c, d}", [["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"]]);
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

/**
 * Full integration test of the mercury stack, using a mock chrome to input
 * bookmarks and providing input through the omnibox listener interface.
 * Returns a list of suggestions, each one a simple description string of
 * the actual suggestion returned.
 */
function getFullMatch(bookmarks, text) {
  var chrome = new FakeChrome();
  bookmarks.forEach(function (bookmark) {
    chrome.addBookmark(bookmark, "<url>");
  });
  var mercury = new Mercury(chrome);
  mercury.install();
  var results = [];
  var suggests = chrome.setOmniboxText(text);
  if (chrome.defaultSuggestion) {
    results.push(chrome.defaultSuggestion.getSimpleDescription().toString());
  }
  suggests.forEach(function (suggest) {
    results.push(suggest.getSimpleDescription().toString());
  });
  return results;
}

function testResultCase() {
  assertListEquals(getFullMatch(["FooBar"], "fb"), ["[F]oo[B]ar"]);
  assertListEquals(getFullMatch(["FooBarBaz"], "fbb"), ["[F]oo[B]ar[B]az"]);
}

function runSingleTest(fun, name) {
  var div = document.createElement('div');
  div.innerText = name;
  document.body.appendChild(div);
  try {
    fun();
    div.style.color = "green";
  } catch (e) {
    div.style.color = "red";
    div.innerText += " (" + e + ")";
  }
}

function runMercuryTests() {
  for (prop in this) {
    if (String(prop).startsWith("test")) {
      runSingleTest(this[prop], prop);
    }
  }
}
