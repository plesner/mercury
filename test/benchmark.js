"use strict";

var kProfile = false;
var kRepeatCount = 16;

function ResultCollector() {
  this.results = [];
}

ResultCollector.prototype.addResult = function (value) {
  this.results.push(value);
};

ResultCollector.prototype.getAverage = function () {
  var sum = 0;
  this.results.forEach(function (result) {
    sum += result;
  });
  return sum / this.results.length;
};

ResultCollector.prototype.getStandardDeviation = function () {
  var mean = this.getAverage();
  var deviationSquare = 0;
  this.results.forEach(function (result) {
    deviationSquare += (result - mean) * (result - mean);
  });
  return Math.sqrt(deviationSquare / this.results.length);
};

ResultCollector.prototype.getConfidence = function (interval) {
  var standardMeanError = this.getStandardDeviation() / Math.sqrt(this.results.length);
  return interval * standardMeanError;
};

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

function getFinalizer(step, results, onDone) {
  return function () {
    var average = results.getAverage().toPrecision(4);
    var confidence = results.getConfidence(0.05).toPrecision(4);
    subStep(step,  "[" + average + " +/- " + confidence + "]");
    if (onDone)
      onDone();
  };
}

Benchmark.prototype.runInstallBenchmark = function (onDone) {
  var step = addStep("Running install benchmark...");
  var chrome = new FakeChrome();
  TestData.get().addBookmarks(chrome, 1000000);
  var results = new ResultCollector();
  deferredFor(0, kRepeatCount, function (i) {
    var mercury;
    var duration = measure("install", function () {
      mercury = new Mercury(chrome);
      mercury.install();
    });
    results.addResult(duration);
    chrome.clearListeners();
    subStep(step, duration);
  }, getFinalizer(step, results, onDone));
};

Benchmark.prototype.runSearchBenchmark = function (onDone) {
  var step = addStep("Running search benchmark...");
  var chrome = new FakeChrome();
  TestData.get().addBookmarks(chrome, 10000);
  var mercury = new Mercury(chrome);
  mercury.install();
  var queries = this.getAbbrevs(100);
  var results = new ResultCollector();
  deferredFor(0, kRepeatCount, function (i) {
    var duration = measure("search", function () {
      queries.forEach(function (query) {
        chrome.setOmniboxText(query);
      });
    });
    results.addResult(duration);
    subStep(step, duration);
  }, getFinalizer(step, results, onDone));
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
