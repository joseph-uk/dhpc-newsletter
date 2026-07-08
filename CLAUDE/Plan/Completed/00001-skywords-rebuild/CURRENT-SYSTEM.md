# Current System — Research Dump

Source: https://www.dhpc.org.uk/skywords/

This document captures the complete current implementation for reference during the rebuild.
Agents should replicate the same behaviour and visual appearance using React/TypeScript.

---

## URL Scheme

The app uses hash-based routing:

- `#url=<published-google-doc-url>` — loads that document
- `#id=<doc-id>` — constructs `https://docs.google.com/document/d/e/<id>/pub`
- No hash → shows the instructions/URL input screen

Example:
```
https://www.dhpc.org.uk/skywords/#url=https://docs.google.com/document/d/e/2PACX-1vSv7aTai2yfObOHeDmYhtKpXFTQejk7imMRBqzlefdnvKGEHtBsWLlF-xIGUSbMphLnwFub-9jrvHaR/pub
```

---

## Current JavaScript — `index.js` (complete source)

```javascript
var app = angular.module("Website_App", ["ngSanitize"]);
var scope = null;
var http = null;
app.controller("Website_Controller", function ($scope, $http) {
  scope = $scope;
  http = $http;
  var loadUrl = false;
  if (config.url != null) {
    config.url = config.url + "?embedded=true";
  }
  if (window.location.hash) {
    var params = getHashParams();
    if (params.hasOwnProperty("id")) {
      config.url =
        "https://docs.google.com/document/d/e/" +
        params["id"] +
        "/pub?embedded=true";
    } else if (params.hasOwnProperty("url")) {
      config.url = params["url"] + "?embedded=true";
    }
  }
  if (config.url == null) {
    $("#instructions").removeClass("Hidden");
  } else {
    $("#instructions").addClass("Hidden");
    loadUrl = true;
  }
  if (loadUrl) {
    $http.get(config.url).success(function (response) {
      var data = formatContent(response);

      $scope.data = {
        ...data,
        sections: data.sections.filter((section) => {
          return section.title.trim();
        }),
      };

      $(".Section").addClass("Hidden");
      $(".Index_Section").removeClass("Hidden");
    });
  }
});

$(() => {
  let sectionId = null;
  let nextSectionId = null;
  $(document).on("click", ".Section_Link", (element) => {
    sectionId = element.target.id.split("_").pop();
    $(".Section").addClass("Hidden");
    $("#section_" + sectionId).removeClass("Hidden");
  });
  $(document).on("click", ".Home", (element) => {
    $(".Section").addClass("Hidden");
    $(".Index_Section").removeClass("Hidden");
  });
  $(document).on("click", ".Back", (element) => {
    nextSectionId = (parseInt(sectionId) - 1).toString();
    if (nextSectionId < 0) {
      $(".Section").addClass("Hidden");
      $(".Index_Section").removeClass("Hidden");
    } else {
      $(".Section").addClass("Hidden");
      $("#section_" + nextSectionId).removeClass("Hidden");
      sectionId = nextSectionId;
    }
  });
  $(document).on("click", ".Next", (element) => {
    nextSectionId = (parseInt(sectionId) + 1).toString();
    if (nextSectionId > scope.data.sections.length - 1) {
      $(".Section").addClass("Hidden");
      $(".Index_Section").removeClass("Hidden");
    } else {
      $(".Section").addClass("Hidden");
      $("#section_" + nextSectionId).removeClass("Hidden");
      sectionId = nextSectionId;
    }
  });
  $("#generate").on("click", (element) => {
    var url = $("#urlBox").val();
    window.location.href += "#url=" + url;
    location.reload();
  });
});

function convertToHTML(elements) {
  var html = $("<div/>").append(elements).html();
  return html;
}

function reformatContent(container) {
  $(container + " a").each((_index, element) => {
    var url = $(element).attr("href");
    if (url) {
      var reg = /https:\/\/www.google.com\/url\?q=(.*)&sa=(.*)/g;
      url = url.replace(reg, "$1");
      $(element).attr("href", url);
      $(element).attr("target", "_blank");
    }
  });

  $(container + " ul").each((index, element) => {
    var classes = $(element).attr("class");
    if (classes.indexOf("-0") != -1) {
      $(element).find("li").addClass("Level_0");
    } else if (classes.indexOf("-1") != -1) {
      $(element).find("li").addClass("Level_1");
    } else if (classes.indexOf("-2") != -1) {
      $(element).find("li").addClass("Level_2");
    } else if (classes.indexOf("-3") != -1) {
      $(element).find("li").addClass("Level_3");
    } else if (classes.indexOf("-4") != -1) {
      $(element).find("li").addClass("Level_4");
    } else if (classes.indexOf("-5") != -1) {
      $(element).find("li").addClass("Level_5");
    }
  });
}

function getHashParams() {
  var hashParams = {};
  var e,
    a = /\+/g,
    r = /([^&;=]+)=?([^&;]*)/g,
    d = function (s) {
      return decodeURIComponent(s.replace(a, " "));
    },
    q = window.location.hash.substring(1);
  while ((e = r.exec(q))) hashParams[d(e[1])] = d(e[2]);
  return hashParams;
}

function formatContent(response) {
  var content = {};
  var container = "#temp";
  $(container).html(response);
  reformatContent(container);
  content.title = $(container + " .title").text();
  content.sections = [];
  var sections = $(container + " h1").toArray();
  for (var i = 0; i < sections.length; i++) {
    content.sections[i] = {};
    content.sections[i].title = $(sections[i]).text();
    content.sections[i].sections = [];
    if (i == sections.length - 1) {
      content.sections[i].contentAll = $(sections[i]).nextAll();
    } else {
      content.sections[i].contentAll = $(sections[i]).nextUntil(
        sections[i + 1]
      );
    }
    var subSections = content.sections[i].contentAll.filter("h2").toArray();
    if (subSections.length > 0) {
      content.sections[i].content = convertToHTML(
        $(sections[i]).nextUntil(subSections[0])
      );
    } else {
      content.sections[i].content = convertToHTML(
        content.sections[i].contentAll
      );
    }
    for (var j = 0; j < subSections.length; j++) {
      content.sections[i].sections[j] = {};
      content.sections[i].sections[j].title = $(subSections[j]).text();
      content.sections[i].sections[j].sections = [];
      if (j == subSections.length - 1) {
        if (i == sections.length - 1) {
          content.sections[i].sections[j].content = convertToHTML(
            $(subSections[j]).nextAll()
          );
        } else {
          content.sections[i].sections[j].content = convertToHTML(
            $(subSections[j]).nextUntil(sections[i + 1])
          );
        }
      } else {
        content.sections[i].sections[j].content = convertToHTML(
          $(subSections[j]).nextUntil(subSections[j + 1])
        );
      }
    }
  }
  $(container).html("");
  return content;
}
```

---

## Current CSS — `index.css` (key styles)

```css
/* Google Font */
@import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@100..900&display=swap');

:root {
  --text: #2b2b3a;
  --blue_background: #0d3c7c;
  --normal: #1ed2f4;
  --hover: #eafc40;
  --alt: #f5ce28;
  --white: #fff;
  --links: rgb(0, 94, 184);
}

* {
  font-family: "Commissioner", sans-serif;
}

body {
  margin: 0;
  padding: 0;
}

.header {
  width: 100%;
  height: 150px;
  background-color: var(--blue_background);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.header_title {
  color: var(--white);
  font-size: 3em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.logo {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  height: 120px;
}

.Index_Title {
  text-align: center;
  font-size: 2em;
  text-transform: uppercase;
  color: var(--text);
  padding: 20px 0;
}

.Section_Link {
  display: block;
  padding: 15px 0;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 1.2em;
  color: var(--text);
  text-align: center;
}

.Section_Link:hover {
  color: var(--links);
}

.Section_Title {
  text-align: center;
  font-size: 2em;
  text-transform: uppercase;
  color: var(--text);
  padding: 20px 0;
}

.Subsection_Title {
  text-align: center;
  font-size: 1.5em;
  text-transform: uppercase;
  color: var(--text);
  padding: 15px 0;
}

.Section_Content, .Subsection_Content {
  width: 80%;
  margin: 0 auto;
  line-height: 1.6;
  color: var(--text);
}

.Section_Content img, .Subsection_Content img {
  max-width: 100%;
  height: auto;
}

a {
  color: var(--links);
}

/* Navigation */
.Navigation {
  display: flex;
  justify-content: space-between;
  width: 80%;
  margin: 30px auto;
  padding: 20px 0;
}

.Navigation div {
  cursor: pointer;
  color: var(--normal);
  font-size: 1.2em;
}

.Navigation div:hover {
  color: var(--hover);
}

/* List indentation */
.Level_0 { margin-left: 0px; }
.Level_1 { margin-left: 40px; }
.Level_2 { margin-left: 80px; }
.Level_3 { margin-left: 120px; }
.Level_4 { margin-left: 160px; }
.Level_5 { margin-left: 200px; }

/* Visibility */
.Hidden { display: none; }

/* Instructions panel */
#instructions {
  width: 80%;
  margin: 40px auto;
  text-align: center;
}

#instructions input {
  width: 60%;
  padding: 10px;
  font-size: 1em;
  margin: 10px 0;
}

#instructions button {
  padding: 10px 30px;
  font-size: 1em;
  background-color: var(--blue_background);
  color: white;
  border: none;
  cursor: pointer;
}

#instructions button:hover {
  background-color: var(--normal);
}

/* Responsive */
@media (max-width: 600px) {
  .header { height: 100px; }
  .header_title { font-size: 2em; }
  .logo { display: none; }
}
```

---

## Current HTML Template Structure

```html
<html ng-app="Website_App" ng-controller="Website_Controller">
<head>
  <title>{{data.title}}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Commissioner:wght@100..900&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="index.css">
</head>
<body>
  <!-- Hidden div for HTML parsing -->
  <div id="temp" style="display:none"></div>

  <!-- Header -->
  <div class="header">
    <img class="logo" src="dhcp_logo.jpeg" alt="DHPC Logo">
    <div class="header_title">Skywords</div>
  </div>

  <!-- Instructions (shown when no URL) -->
  <div id="instructions" class="Hidden">
    <h2>Skywords Newsletter Viewer</h2>
    <p>Paste a published Google Docs URL below to view it as a newsletter</p>
    <input id="urlBox" type="text" placeholder="https://docs.google.com/document/d/e/.../pub">
    <br>
    <button id="generate">Load Newsletter</button>
  </div>

  <!-- Document Index (section list) -->
  <div class="Section Index_Section Hidden">
    <div class="Index_Title">{{data.title}}</div>
    <div ng-repeat="section in data.sections">
      <div class="Section_Link" id="link_{{$index}}">{{section.title}}</div>
    </div>
  </div>

  <!-- Section Views -->
  <div ng-repeat="section in data.sections" id="section_{{$index}}" class="Section Hidden">
    <div class="Section_Title">{{section.title}}</div>
    <div class="Section_Content" ng-bind-html="section.content"></div>

    <!-- Subsections -->
    <div ng-repeat="sub in section.sections">
      <div class="Subsection_Title">{{sub.title}}</div>
      <div class="Subsection_Content" ng-bind-html="sub.content"></div>
    </div>

    <!-- Navigation -->
    <div class="Navigation">
      <div class="Back"><i class="fa fa-arrow-left"></i> Back</div>
      <div class="Home"><i class="fa fa-home"></i> Home</div>
      <div class="Next">Next <i class="fa fa-arrow-right"></i></div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.min.js"></script>
  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular-sanitize.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="config.js"></script>
  <script src="index.js"></script>
</body>
</html>
```

---

## Key Parsing Logic (what `docParser.ts` must replicate)

The `formatContent()` function does the following:

1. Inject raw Google Docs HTML into a hidden `#temp` div
2. Call `reformatContent()` to:
   - Rewrite Google redirect links: `https://www.google.com/url?q=ACTUAL_URL&sa=...` → `ACTUAL_URL`
   - Set `target="_blank"` on all links
   - Detect list indent level from `<ul class="lst-kix_xxx-N">` where N is 0-5
   - Add `Level_N` class to the `<li>` elements within those lists
3. Extract document title from `.title` class element
4. Find all `<h1>` elements → these become top-level sections
5. For each `<h1>`:
   - Get all sibling elements until the next `<h1>` (or end of document)
   - Within those siblings, find `<h2>` elements → subsections
   - Content before first `<h2>` = section intro content
   - Content between `<h2>` elements = subsection content
   - Last `<h2>` content extends to the next `<h1>` or end of document
6. Serialise each content chunk back to HTML string
7. Filter out sections with empty/whitespace-only titles

### Data structure produced

```javascript
{
  title: "March 2026 Newsletter",
  sections: [
    {
      title: "Chairman's Report",
      content: "<p>Intro text before first h2...</p>",
      sections: [    // subsections (h2-delimited)
        {
          title: "AGM Update",
          content: "<p>Subsection content...</p>",
          sections: []
        }
      ]
    },
    // ... more sections
  ]
}
```

---

## Navigation Behaviour

- **Index screen**: shows document title + list of all section titles as clickable links
- **Section view**: clicking a section link hides index, shows that section
- **Back button**: goes to previous section; if at first section, goes to index
- **Home button**: always returns to index
- **Next button**: goes to next section; if at last section, goes to index
- **Scrolls to top** on navigation (implied by full section swap)

---

## External Dependencies (current)

| Dependency | URL | Purpose |
|-----------|-----|---------|
| AngularJS 1.5.6 | ajax.googleapis.com | Framework |
| angular-sanitize 1.5.6 | ajax.googleapis.com | HTML sanitisation |
| jQuery 3.6.0 | code.jquery.com | DOM manipulation |
| W3.CSS | w3schools.com/w3css/4/w3.css | CSS framework |
| Font Awesome 6.5.0 | cdnjs.cloudflare.com | Icons |
| Commissioner font | fonts.googleapis.com | Typography |

In the rebuild, only Font Awesome and Commissioner font remain as CDN dependencies.
Everything else is replaced by React, DOMPurify, and CSS Modules.

---

## Test URL for QA

```
https://docs.google.com/document/d/e/2PACX-1vSv7aTai2yfObOHeDmYhtKpXFTQejk7imMRBqzlefdnvKGEHtBsWLlF-xIGUSbMphLnwFub-9jrvHaR/pub
```

This is the March 2026 DHPC newsletter. Sections include: Chairman's Report, Coaching, Sites & News, Airspace Proposal, Life Membership, Treasurer Succession, Photos.
