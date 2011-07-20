var mercury = new Mercury(new Chrome());

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
