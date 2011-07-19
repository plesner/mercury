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

function compareLists(one, two) {
  if (one == two)
    return;
  assertTrue(one.length == two.length);
  for (var i = 0; i < one.length; i++) {
    assertTrue(one[i] == two[i]);
  }
}

function compareInnerLists(one, two) {
  if (one == two)
    return;
  assertTrue(one.length == two.length);
  for (var i = 0; i < one.length; i++) {
    compareLists(one[i], two[i]);
  }
}


function compareScores(a, b) {
  function newMatch(a) { return new Match(0, 0, a); }
  return new Score(a.map(newMatch)).compareTo(new Score(b.map(newMatch)));
}

function testCompareScores() {
  assertTrue(compareScores([1, 1], [1, 1]) == 0);
  assertTrue(compareScores([0, 1], [1, 1]) < 0);
  assertTrue(compareScores([1, 1], [0, 1]) > 0);
  assertTrue(compareScores([1, 0], [1, 1]) < 0);
  assertTrue(compareScores([1, 1], [1, 0]) > 0);
  assertTrue(compareScores([1, 2], [1, 1]) > 0);
}

function scoreVectors(a, b) {
  var score = Score.create(a, b);
  if (score == null) {
    return null;
  } else {
    return score.matches.map(function (m) { return m.score; });
  }
}

function testScoreVectors() {
  compareLists(scoreVectors(["foo", "bar", "baz"], ["ar", "az"]), [2, 2]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["az"]), [3]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["foo", "bar", "baz"]), [0, 0, 0]);
  compareLists(scoreVectors(["foo", "foo"], ["foo"]), [0]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["xxx"]), null);
}

function testGetDistance() {
  assertTrue(Match.getScore("abcdefg", "abcdefg") == 0);
  assertTrue(Match.getScore("abcdefg", "abcdef") == 1);
  assertTrue(Match.getScore("abcdefg", "abcde") == 1);
  assertTrue(Match.getScore("abcdefg", "a") == 1);
  assertTrue(Match.getScore("abcdefg", "abd") == 2);
  assertTrue(Match.getScore("abcdefg", "abe") == 3);
  assertTrue(Match.getScore("abcdefg", "acd") == 2);
  assertTrue(Match.getScore("abcdefg", "ade") == 3);
  assertTrue(Match.getScore("abcdefg", "ag") == 5);
  assertTrue(Match.getScore("abcdefg", "x") == -1);
}

function testGetOverlapIndices() {
  compareLists(Match.getOverlapIndices("abcdefg", "abcdefg"), [0, 1, 2, 3, 4, 5, 6]);
  compareLists(Match.getOverlapIndices("abcdefg", "abcdef"), [0, 1, 2, 3, 4, 5]);
  compareLists(Match.getOverlapIndices("abcdefg", "abcde"), [0, 1, 2, 3, 4]);
  compareLists(Match.getOverlapIndices("abcdefg", "abde"), [0, 1, 3, 4]);
  compareLists(Match.getOverlapIndices("abcdefg", "a"), [0]);
  compareLists(Match.getOverlapIndices("abcdefg", "cd"), [2, 3]);
  compareLists(Match.getOverlapIndices("abcdefg", "fg"), [5, 6]);
  compareLists(Match.getOverlapIndices("abcdefg", "abd"), [0, 1, 3]);
  compareLists(Match.getOverlapIndices("abcdefg", "abe"), [0, 1, 4]);
  compareLists(Match.getOverlapIndices("abcdefg", "acd"), [0, 2, 3]);
  compareLists(Match.getOverlapIndices("abcdefg", "ade"), [0, 3, 4]);
  compareLists(Match.getOverlapIndices("abcdefg", "ag"), [0, 6]);
  compareLists(Match.getOverlapIndices("abcdefg", "x"), []);
}

function testGetOverlapRegions() {
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abcdefg"), [[0, 6]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abcdef"), [[0, 5]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abcde"), [[0, 4]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abde"), [[0, 1], [3, 4]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "a"), [[0, 0]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "cd"), [[2, 3]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "fg"), [[5, 6]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abd"), [[0, 1], [3, 3]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "abe"), [[0, 1], [4, 4]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "acd"), [[0, 0], [2, 3]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "ade"), [[0, 0], [3, 4]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "ag"), [[0, 0], [6, 6]]);
  compareInnerLists(Match.getOverlapRegions("abcdefg", "x"), []);
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
