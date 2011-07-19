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

function testCompareScores() {
  assertTrue(compareScores([1, 1], [1, 1]) == 0);
  assertTrue(compareScores([0, 1], [1, 1]) < 0);
  assertTrue(compareScores([1, 1], [0, 1]) > 0);
  assertTrue(compareScores([1, 0], [1, 1]) < 0);
  assertTrue(compareScores([1, 1], [1, 0]) > 0);
  assertTrue(compareScores([1, 2], [1, 1]) > 0);
}

function testScoreVectors() {
  compareLists(scoreVectors(["foo", "bar", "baz"], ["ar", "az"]), [2, 2]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["az"]), [3]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["foo", "bar", "baz"]), [0, 0, 0]);
  compareLists(scoreVectors(["foo", "foo"], ["foo"]), [0]);
  compareLists(scoreVectors(["foo", "bar", "baz"], ["xxx"]), null);
}

function testGetDistance() {
  assertTrue(getDistance("abcdefg", "abcdefg") == 0);
  assertTrue(getDistance("abcdefg", "abcdef") == 1);
  assertTrue(getDistance("abcdefg", "abcde") == 1);
  assertTrue(getDistance("abcdefg", "a") == 1);
  assertTrue(getDistance("abcdefg", "abd") == 2);
  assertTrue(getDistance("abcdefg", "abe") == 3);
  assertTrue(getDistance("abcdefg", "acd") == 2);
  assertTrue(getDistance("abcdefg", "ade") == 3);
  assertTrue(getDistance("abcdefg", "ag") == 5);
  assertTrue(getDistance("abcdefg", "x") == -1);
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
