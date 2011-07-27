var kProfile = true;

BenchmarkFakeChrome.inherit(FakeChrome);
function BenchmarkFakeChrome() {
  FakeChrome.call(this);
  this.timeSpentBookmarking = 0;
}

BenchmarkFakeChrome.prototype.getBookmarksTree = function (callback) {
  var start = new Date();
  if (kProfile) console.profile("install");
  FakeChrome.prototype.getBookmarksTree.call(this, callback);
  if (kProfile) console.profileEnd("install");
  var end = new Date();
  this.timeSpentBookmarking += (end - start);
}

function getTestBookmarks() {
  var result = [];
  for (url in top1000Sites) {
    var value = top1000Sites[url];
    if (url && value && value.url && value.title)
      result.push(value);
  }
  return result;
}

function addStep(text) {
  var li = document.createElement("li");
  li.innerHTML = "<b>" + text + "</b>";
  document.getElementById("steps").appendChild(li);
  return li;
}

function subStep(item, step) {
  item.innerHTML += " " + step;
}

function defer(thunk) {
  window.setTimeout(thunk, 50);
}

function deferredFor(from, to, thunk) {
  if (from == to)
    return;
  defer(function () {
    thunk(from);
    deferredFor(from + 1, to, thunk);
  });
}

function measure(id, thunk) {
  var start = new Date();
  if (kProfile) console.profile(id);
  thunk();
  if (kProfile) console.profileEnd(id);
  var end = new Date();
  return end - start;
}

function startInstallBenchmark() {
  var step = addStep("Running install benchmark...");
  deferredFor(0, 10, function (i) {
    var mercury = new Mercury(fakeChrome);
    mercury.install();
    fakeChrome.clearListeners();
    var timeRecorded = fakeChrome.timeSpentBookmarking;
    fakeChrome.timeSpentBookmarking = 0;
    subStep(step, timeRecorded);
  });
}

function startSearchBenchmark() {
  var step = addStep("Running search benchmark...");
  var mercury = new Mercury(fakeChrome);
  mercury.install();
  deferredFor(0, 1, function (i) {
    var duration = measure("search", function () {
      fakeQueries.forEach(function (query) {
        fakeChrome.setOmniboxText(query);
      });
    });
    subStep(step, duration);
  });
}

function setupFakeBookmarks(chrome) {
  for (var i = 0; i < 1; i++) {
    getTestBookmarks().forEach(function (bookmark) {
      chrome.addBookmark(bookmark.title, bookmark.url);
    });
  }
}

function isWord(str) {
  return !!(/^\w/.exec(str));
}

function buildFakeQueries() {
  var seen = {};
  var all = [];
  getTestBookmarks().forEach(function (bookmark) {
    var title = bookmark.title;
    var words = title.split(" ");
    var letters = "";
    words.forEach(function (word) {
      if (isWord(word)) {
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
}

var fakeQueries;
var fakeChrome = new BenchmarkFakeChrome();
function setupBenchmarkData() {
  var step = addStep("Setting up benchmark data...");
  defer(function () {
    setupFakeBookmarks(fakeChrome);
    subStep(step, "bookmarks");
    defer(function () {
      fakeQueries = buildFakeQueries();
      subStep(step, "queries");
    });
  });
}
