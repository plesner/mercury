var mercury = new Mercury(new Chrome());

// Yes, as a matter of fact I do love how inconsistent JS is.  Otherwise I
// wouldn't have to spend my time writing junk like this.
NodeList.prototype.toArray = function () {
  return Array.prototype.slice.call(this);
};

function toggleVisible(element) {
  var style = element.style;
  if (style.display != "inline") {
    style.display = "inline";
  } else {
    style.display = "none";
  }
}

function expanderClicked(name) {
  var spans = document.getElementsByClassName(name + "Help").toArray();
  spans.forEach(toggleVisible);
}

function textKeyUp() {
  var entries = document.getElementById("entries");
  var text = document.getElementById("text").value;
  var suggests = mercury.fetchNextSuggestion(text);
  showSuggestions(suggests);
}

function showSuggestions(suggests) {
  var div = document.getElementById("entries");
  while (div.childNodes.length > 0)
    div.removeChild(div.childNodes[0]);
  suggests.forEach(function (suggest) {
    var child = document.createElement('div');
    child.innerText = suggest.getScore() + " - " + suggest.getDescription();
    div.appendChild(child);
  });
}

function startOptions() {
}
