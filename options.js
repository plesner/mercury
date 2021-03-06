"use strict";

function inherits(parent, base) {
  function Inheriter() { }
  Inheriter.prototype = parent.prototype;
  base.prototype = new Inheriter();
}

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
  this.indicator = fetchElement(name + "Indicator");
}

Setting.prototype.applyCurrentSettings = function () {
  this.updateValue();
  this.updateIndicator();
};

Setting.prototype.getName = function () {
  return this.name;
};

Setting.prototype.updateAfterChange = function () {
  this.updateIndicator();
  this.settings.onSettingChanged();
};

/**
 * A single boolean-valued setting.
 */
function BooleanSetting(name, settings) {
  Setting.call(this, name, settings);
  this.checkbox = fetchElement(name + "Checkbox");
  this.checkbox.addEventListener('click', this.updateAfterChange.bind(this));
}
inherits(Setting, BooleanSetting);

BooleanSetting.prototype.updateValue = function () {
  this.checkbox.checked = this.settings.getCurrentValue(this.name);
};

BooleanSetting.prototype.getValue = function () {
  return this.checkbox.checked;
}

BooleanSetting.prototype.updateIndicator = function () {
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

BooleanSetting.prototype.hasChanged = function () {
  return this.settings.getCurrentValue(this.name) != this.getValue();
};

function ArraySetting(name, settings) {
  Setting.call(this, name, settings);
  this.text = fetchElement(name + "Text");
  this.text.addEventListener('keyup', this.updateAfterChange.bind(this));
  this.text.addEventListener('change', this.updateAfterChange.bind(this));
}
inherits(Setting, ArraySetting);

ArraySetting.prototype.getValue = function () {
  var rawParts = this.text.value.split(",");
  var parts = [];
  rawParts.forEach(function (part) {
    var stripped = part.replace(/\s/g, '');
    if (stripped) {
      parts.push(stripped);
    }
  });
  return parts;
};

ArraySetting.prototype.updateValue = function () {
  this.text.value = this.settings.getCurrentValue(this.name).join(", ");
};

ArraySetting.prototype.updateIndicator = function () {
  if (!this.hasChanged()) {
    this.indicator.innerText = "unchanged";
    this.indicator.className = "status unchanged";
  } else {
    this.indicator.innerText = "changed";
    this.indicator.className = "status enabled";
  }
};

ArraySetting.prototype.hasChanged = function () {
  return String(this.settings.getCurrentValue(this.name)) != String(this.getValue());
};

/**
 * All the state associated with a settings page.
 */
function SettingsPage(current) {
  this.current = current;
  var currentJson = JSON.parse(current.toJson());
  this.controls = [];
  for (var prop in currentJson) {
    var value = currentJson[prop];
    if (typeof value == 'boolean') {
      this.controls.push(new BooleanSetting(prop, this));
    } else if (Array.isArray(value)) {
      this.controls.push(new ArraySetting(prop, this))
    } else {
      console.log("Unknown setting type", prop, value);
    }
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
  var entries = fetchElement("entries");
  var text = fetchElement("text").value;
  var suggests = mercury.fetchNextSuggestion(text);
  showSuggestions(suggests);
}

function showSuggestions(suggests) {
  var div = fetchElement("entries");
  while (div.childNodes.length > 0)
    div.removeChild(div.childNodes[0]);
  var index = 0;
  suggests.forEach(function (suggest) {
    var child = document.createElement('div');
    child.className = "completion" + (index % 2);
    index++;
    child.innerText = suggest.getScore().getScore() + ": " + suggest.getDescription();
    div.appendChild(child);
  });
}

function startOptions() {
  new SettingsPage(Settings.getFromLocalStorage()).install();
}
