var kProfile = false;

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

function recordTime(item, time) {
  item.innerHTML += " " + time;
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

var chrome = new BenchmarkFakeChrome();
defer(function () {
  for (var i = 0; i < 1000; i++) {
    getTestBookmarks().forEach(function (bookmark) {
      chrome.addBookmark(bookmark.title, bookmark.url);
    });
  }
});

function startInstallBenchmark() {
  var step = addStep("Running install benchmark");
  deferredFor(0, 5, function (i) {
    var mercury = new Mercury(chrome);
    mercury.install();
    chrome.clearListeners();
    var timeRecorded = chrome.timeSpentBookmarking;
    chrome.timeSpentBookmarking = 0;
    recordTime(step, timeRecorded);
  });
}
