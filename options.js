"use strict";

var mercury = new Mercury(new Chrome());

function fetchElement(id) {
  var result = document.getElementById(id);
  assertTrue(result != null);
  return result;
}

/**
 * A single setting associated with a settings page.
 */
function Setting(name, settings) {
  this.settings = settings;
  this.name = name;
  this.checkbox = fetchElement(name + "Checkbox");
  this.indicator = fetchElement(name + "Indicator");
  this.checkbox.addEventListener('click', this.onClicked.bind(this));
}

Setting.prototype.applyCurrentSettings = function () {
  this.updateValue();
  this.updateIndicator();
};

Setting.prototype.getName = function () {
  return this.name;
};

Setting.prototype.onClicked = function () {
  this.updateIndicator();
  this.settings.onSettingChanged();
};

Setting.prototype.updateValue = function () {
  this.checkbox.checked = this.settings.getCurrentValue(this.name);
};

Setting.prototype.getValue = function () {
  return this.checkbox.checked;
}

Setting.prototype.updateIndicator = function () {
  if (!this.hasChanged()) {
    this.indicator.innerText = "unchanged";
    this.indicator.className = "status unchanged";
  } else {
    var before = this.settings.getCurrentValue(this.name);
    if (before) {
      this.indicator.innerText = "disabled";
      this.indicator.className = "status disabled";
    } else {
      this.indicator.innerText = "enabled";
      this.indicator.className = "status enabled";
    }
  }
};

Setting.prototype.hasChanged = function () {
  return this.settings.getCurrentValue(this.name) != this.getValue();
}

/**
 * All the state associated with a settings page.
 */
function SettingsPage(current) {
  this.current = current;
  var currentJson = JSON.parse(current.toJson());
  this.controls = [];
  for (var prop in currentJson) {
    this.controls.push(new Setting(prop, this));
  }
  this.save = fetchElement("save");
  this.reset = fetchElement("reset");
}

SettingsPage.prototype.install = function () {
  this.save.addEventListener("click", this.onSave.bind(this));
  this.reset.addEventListener("click", this.onReset.bind(this));
  window.addEventListener("storage", this.onStorageChanged.bind(this), false);
  this.applyCurrentSettings();  
};

SettingsPage.prototype.onStorageChanged = function () {
  this.current = Settings.getFromLocalStorage();
  this.applyCurrentSettings();
};

SettingsPage.prototype.onSettingChanged = function () {
  this.updateEnablement();
};

SettingsPage.prototype.onSave = function () {
  var newSettingsJson = {};
  this.controls.forEach(function (control) {
    newSettingsJson[control.getName()] = control.getValue();
  });
  new Settings(newSettingsJson).saveToLocalStorage();
  // We can't depend on storage change events being fired in all windows so
  // we force an update here.  This can be removed when chrome implements
  // storage event firing correctly.
  this.onStorageChanged();
};

SettingsPage.prototype.onReset = function () {
  this.applyCurrentSettings();
};

SettingsPage.prototype.applyCurrentSettings = function () {
  this.controls.forEach(function (control) {
    control.applyCurrentSettings();
  });
  this.updateEnablement();
};

SettingsPage.prototype.updateEnablement = function () {
  var hasChanges = false;
  this.controls.forEach(function (control) {
    if (control.hasChanged()) {
      hasChanges = true;
    }
  });
  this.save.disabled = !hasChanges;
  this.reset.disabled = !hasChanges;
};

SettingsPage.prototype.getCurrentValue = function (name) {
  return this.current[name];
};

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
    child.innerText = suggest.getScore().getScore() + " - " + suggest.getDescription();
    div.appendChild(child);
  });
}

function startOptions() {
  new SettingsPage(Settings.getFromLocalStorage()).install();
}
