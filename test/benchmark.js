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

/**
 * Container object for benchmark data.
 */
function Benchmark() {
  /**
   * A fake chrome with a large set of fake benchmarks.
   */
  this.fakeChrome = new BenchmarkFakeChrome();
  
  /**
   * All abbreviations for fake benchmark titles.
   */
  this.allAbbrevs = null;
}

Benchmark.prototype.initialize = function () {
  var step = addStep("Setting up benchmark data...");
  var self = this;
  defer(function () {
    self.initBookmarks(step);
    defer(function () {
      self.initAbbrevs(step);
    });
  });
};
 
Benchmark.prototype.initBookmarks = function (step) {
  subStep(step, "bookmarks");
  var testdata = Benchmark.getTestBookmarks();
  var chrome = this.fakeChrome;
  for (var i = 0; i < 10; i++) {
    testdata.forEach(function (bookmark) {
      chrome.addBookmark(bookmark.title, bookmark.url);
    });
  }
};

Benchmark.prototype.initAbbrevs = function (step) {
  subStep(step, "queries");
  var seen = {};
  var all = [];
  Benchmark.getTestBookmarks().forEach(function (bookmark) {
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
  this.allAbbrevs = all;
}

Benchmark.getTestBookmarks = function () {
  var result = [];
  for (url in top1000Sites) {
    var value = top1000Sites[url];
    if (url && value && value.url && value.title)
      result.push(value);
  }
  return result;
};

Benchmark.prototype.getAbbrevs = function (countOpt) {
  if (countOpt) {
    return this.allAbbrevs.slice(0, countOpt);
  } else {
    return this.allAbbrevs;
  }
};

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

function measure(id, thunk) {
  var start = new Date();
  if (kProfile) console.profile(id);
  thunk();
  if (kProfile) console.profileEnd(id);
  var end = new Date();
  return end - start;
}

Benchmark.prototype.runInstallBenchmark = function (onDone) {
  var step = addStep("Running install benchmark...");
  var chrome = this.fakeChrome;
  deferredFor(0, 10, function (i) {
    var mercury = new Mercury(chrome);
    mercury.install();
    chrome.clearListeners();
    var timeRecorded = chrome.timeSpentBookmarking;
    chrome.timeSpentBookmarking = 0;
    subStep(step, timeRecorded);
  }, onDone);
}

Benchmark.prototype.runSearchBenchmark = function (onDone) {
  var step = addStep("Running search benchmark...");
  var chrome = this.fakeChrome;
  var mercury = new Mercury(chrome);
  mercury.install();
  var queries = this.getAbbrevs(100);
  deferredFor(0, 10, function (i) {
    var duration = measure("search", function () {
      queries.forEach(function (query) {
        chrome.setOmniboxText(query);
      });
    });
    subStep(step, duration);
  }, onDone);
}


Benchmark.prototype.runAllBenchmarks = function () {
  this.runInstallBenchmark(function () {
    this.runSearchBenchmark();
  }.bind(this));
};

function isWord(str) {
  return !!(/^\w/.exec(str));
}

var benchmark = null;
function setupBenchmarkData() {
  benchmark = new Benchmark()
  benchmark.initialize();
}
