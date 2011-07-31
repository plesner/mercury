var kProfile = false;

/**
 * Container object for benchmark data.
 */
function Benchmark() {
  /**
   * A fake chrome with a large set of fake benchmarks.
   */
  this.fakeChrome = new FakeChrome();
}

Benchmark.prototype.initialize = function (bookmarkCount) {
  var step = addStep("Setting up benchmark data...");
  defer(function () {
    this.initBookmarks(bookmarkCount, step);
    subStep(step, "done");
  }.bind(this));
};

Benchmark.prototype.initBookmarks = function (bookmarkCount, step) {
  subStep(step, "bookmarks");
  TestData.get().addBookmarks(this.fakeChrome, bookmarkCount);
};

Benchmark.prototype.getAbbrevs = function (countOpt) {
  var abbrevs = TestData.get().getAbbrevs();
  return countOpt ? abbrevs.slice(0, countOpt) : abbrevs;
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
  var chrome = new FakeChrome();
  TestData.get().addBookmarks(chrome, 1000000);
  deferredFor(0, 10, function (i) {
    var mercury;
    var duration = measure("install", function () {
      mercury = new Mercury(chrome);
      mercury.install();
    });
    chrome.clearListeners();
    subStep(step, duration);
  }, onDone);
};

Benchmark.prototype.runSearchBenchmark = function (onDone) {
  var step = addStep("Running search benchmark...");
  var chrome = new FakeChrome();
  TestData.get().addBookmarks(chrome, 10000);
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

var benchmark = null;
function setupBenchmarkData() {
  benchmark = new Benchmark()
}
