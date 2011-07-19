var mercury = new Mercury();

function textKeyUp() {
  var entries = document.getElementById("entries");
  var text = document.getElementById("text").value;
}

function showBookmarks(bookmarks) {
  var div = document.getElementById("bookmarks");
  var current = bookmarks.getCurrent();
  while (div.childNodes.length > 0)
    div.removeChild(div.childNodes[0]);
  for (var i = 0; i < current.length; i++) {
    var bookmark = current[i];
    var child = document.createElement('div');
    child.innerText = bookmark.path;
    div.appendChild(child);
  }
}

function startOptions() {
}
