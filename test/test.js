"use strict";

String.prototype.startsWith = function (substr) {
  if (this.length < substr.length) {
    return false;
  } else {
    return this.substring(0, substr.length) == substr;
  }
};

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
  var score = Score.create(a, Bookmark.dropCase(a), Bookmark.dropCase(b));
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
  var score = Score.create(a, Bookmark.dropCase(a), Bookmark.dropCase(b));
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
  var bookmark = new Bookmark(base, "<url>", null);
  var request = new SuggestionRequest([bookmark], new Settings({}), input);
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

function runScannerTest(config, input, expected) {
  var settings = new Settings(config);
  var tokens = Scanner.scan(input, settings);
  var expectedTokens = expected.map(Bookmark.dropCase);
  assertListEquals(expectedTokens, tokens);
}

function testScanner() {
  var N = {groupVariables: false, groupExpansion: false};
  var G = {groupVariables: false, groupExpansion: true};
  var V = {groupVariables: true, groupExpansion: false};
  var A = {groupVariables: true, groupExpansion: true};
  runScannerTest(N, "", []);
  runScannerTest(N, " ", []);
  runScannerTest(N, "foo bar baz", ["foo", "bar", "baz"]);
  runScannerTest(N, " foo  bar  baz ", ["foo", "bar", "baz"]);
  runScannerTest(N, "  foo   bar   baz  ", ["foo", "bar", "baz"]);
  runScannerTest(N, "a, b", ["a,", "b"]);
  runScannerTest(N, " a , b ", ["a", ",", "b"]);
  runScannerTest(N, " a ,, b ", ["a", ",,", "b"]);
  runScannerTest(N, " a $$ b ", ["a", "$$", "b"]);
  runScannerTest(N, " foo, $bar", ["foo,", "$bar"]);
  runScannerTest(G, "a, b", ["a", ",", "b"]);
  runScannerTest(G, " a , b ", ["a", ",", "b"]);
  runScannerTest(G, " a ,, b ", ["a", ",", ",", "b"]);
  runScannerTest(G, " a $$ b ", ["a", "$$", "b"]);
  runScannerTest(G, " foo, $bar", ["foo", ",", "$bar"]);
  runScannerTest(V, "a, b", ["a,", "b"]);
  runScannerTest(V, " a , b ", ["a", ",", "b"]);
  runScannerTest(V, " a ,, b ", ["a", ",,", "b"]);
  runScannerTest(V, " a $$ b ", ["a", "$", "$", "b"]);
  runScannerTest(V, " foo, $bar", ["foo,", "$", "bar"]);
  runScannerTest(A, "a, b", ["a", ",", "b"]);
  runScannerTest(A, " a , b ", ["a", ",", "b"]);
  runScannerTest(A, " a ,, b ", ["a", ",", ",", "b"]);
  runScannerTest(A, " a $$ b ", ["a", "$", "$", "b"]);
  runScannerTest(A, " foo, $bar", ["foo", ",", "$", "bar"]);
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
  var settings = new Settings({});
  var parsed = Parser.parse(input, settings);
  var expectedTree = mapRecursive(expected, Bookmark.dropCase);
  assertListEquals(expectedTree, parsed.toPojso());
}

function testParserGrouping() {
  runParserTest("foo bar baz", ["foo", "bar", "baz"]);
  runParserTest("foo", ["foo"]);
  runParserTest("foo,", ["foo"]);
  runParserTest("foo $bar", ["foo", ["$", "bar"]]);
  runParserTest("foo $", ["foo", "$"]);
  runParserTest("foo bar, baz", ["foo", ["bar", "baz"]]);
  runParserTest("foo bar , baz", ["foo", ["bar", "baz"]]);
  runParserTest("foo bar, baz, quux", ["foo", ["bar", "baz", "quux"]]);
  runParserTest("foo bar, baz zoom quux", ["foo", ["bar", "baz"], "zoom", "quux"]);
  runParserTest("foo, bar baz, zoom, quux", [["foo", "bar"], ["baz", "zoom", "quux"]]);
}

function runExpansionTest(input, expected) {
  var settings = new Settings({});
  var parsed = Parser.parse(input, settings);
  var expectedTree = mapRecursive(expected, Bookmark.dropCase);
  assertListEquals(expectedTree, parsed.expand());
}

function testParserExpansion() {
  runExpansionTest("foo", [["foo"]]);
  runExpansionTest("foo bar baz", [["foo", "bar", "baz"]]);
  runExpansionTest("foo bar, baz", [["foo", "bar"], ["foo", "baz"]]);
  runExpansionTest("a, b c, d", [["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"]]);
}

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
  return chrome.setOmniboxText(text).map(function (suggestion) {
    return suggestion.getSimpleDescription().toString();
  });
}

function testResultCase() {
  assertListEquals(getFullMatch(["FooBar"], "fb"), ["[F]oo[B]ar"]);
  assertListEquals(getFullMatch(["FooBarBaz"], "fbb"), ["[F]oo[B]ar[B]az"]);
}

/**
 * Dumb implementation of the scoring function to compare smarter
 * implementations against.
 */
function getScoreDumb(string, stringNoCase, offset, abbrev, matches) {
  if (abbrev.length == 0) {
    return 0.9;
  } else if (abbrev.length > (string.length - offset)) {
    return 0.0;
  }
  for (var i = abbrev.length; i > 0; i--) {
    var abbrevPart = abbrev.substring(0, i);
    var matchStartOffset = stringNoCase.indexOf(abbrevPart, offset);
    if (matchStartOffset == -1) {
      continue;
    }
    var matchEndOffset = matchStartOffset + i;
    var nextAbbrev = abbrev.substring(i);
    var remainingScore = getScoreDumb(string, stringNoCase, matchEndOffset,
        nextAbbrev, matches);
    if (remainingScore == 0.0) {
      continue;
    }
    var penalty = 0;
    if (matchStartOffset > offset) {
      if (Score.isWhiteSpace(string.charCodeAt(matchStartOffset - 1))) {
        for (var j = matchStartOffset - 2; j >= offset; j--) {
          penalty += Score.isWhiteSpace(string.charCodeAt(j)) ? 1.0 : 0.15;
        }
      } else if (Score.isUpperCase(string.charAt(matchStartOffset))) {
        for (var j = matchStartOffset - 1; j >= offset; j--) {
          penalty += Score.isUpperCase(string.charAt(j)) ? 1.0 : 0.15;
        }
      } else {
        penalty += matchStartOffset - offset;
      }
    }
    if (matches) {
      matches.push([matchStartOffset, matchEndOffset - 1]);
    }
    var partPoints = (matchEndOffset - offset) - penalty;
    var remainingPoints = remainingScore * (string.length - matchEndOffset);
    return (partPoints + remainingPoints) / (string.length - offset);
  }
  return 0.0;
}

function Match(score, bookmark, markup) {
  this.score = score;
  this.bookmark = bookmark;
  this.markup = markup;
}

Match.prototype.compareTo = function (that) {
  if (this.score == that.score) {
    return String.compare(this.bookmark.title, that.bookmark.title);
  } else {
    return that.score - this.score;
  }
};

/**
 * Dumb implementation of string lookup.  We use this implementation as a
 * reference to compare the smarter implementation that is used in the
 * extension.
 */
function getMatchesDumb(abbrev) {
  var matches = [];
  TestData.get().getBookmarks().forEach(function (bookmark) {
    var title = bookmark.title;
    var url = bookmark.url;
    var regions = [];
    var score = getScoreDumb(title, Bookmark.dropCase(title), 0,
        Bookmark.dropCase(abbrev), regions);
    if (score > 0) {
      matches.push(new Match(score, bookmark, new Markup(title, regions.reverse())));
    }
  });
  matches.sort(function (a, b) { return a.compareTo(b); });
  return matches;
}

/**
 * Returns a subset of the given array but taken from along the whole length
 * of the array.
 */
function getSpreadSlice(array, count) {
  var result = [];
  for (var i = 0; i < array.length; i += (array.length / count))
    result.push(array[i << 0]);
  return result;
}

/**
 * Test that the scoring function works as expected by comparing it with a
 * dumb test implementation.
 */
function testScoring() {
  var chrome = new FakeChrome();
  TestData.get().addBookmarks(chrome);
  var abbrevs = getSpreadSlice(TestData.get().getAbbrevs(), 512);
  var mercury = new Mercury(chrome);
  mercury.install();
  abbrevs.forEach(function (abbrev) {
    var dumbMatches = getMatchesDumb(abbrev);
    var expected = dumbMatches.map(function (match) {
      return match.markup.toString();
    });
    var found = chrome.setOmniboxText(abbrev).map(function (suggestion) {
      return suggestion.getSimpleDescription().toString();
    });
    assertListEquals(expected, found);
  });
}

function runSingleTest(fun, name) {
  var div = document.createElement('div');
  div.innerText = name;
  div.style.color = "grey";
  document.body.appendChild(div);
  defer(function () {
    try {
      fun();
      div.style.color = "green";
    } catch (e) {
      div.style.color = "red";
      div.innerText += " (" + e + ")";
    }
  });
}

function runMercuryTests() {
  var tests = [];
  for (var prop in this) {
    if (String(prop).startsWith("test")) {
      tests.push(prop);
    }
  }
  deferredFor(0, tests.length, function (i) {
    var prop = tests[i];
    runSingleTest(window[prop], prop);
  });
}
