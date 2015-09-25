
/**
 * juice
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

 "use strict";

/**
 * Module dependencies.
 */

var utils = require('./utils');
var Selector = require('./selector');
var Property = require('./property');
var packageJson = require('../package');
var fs = require('fs');
var path = require('path');
var styleSelector = new Selector('<style attribute>', [1, 0, 0, 0]);
var importantSelector = new Selector('<!important>', [2, 0, 0, 0]);

var juice = function (html,options) {
  var $ = utils.cheerio(html, { xmlMode: options && options.xmlMode});
  var doc = juiceDocument($,options);

  if (options && options.xmlMode){
    return doc.xml();
  }
  else {
    return utils.decodeEntities(doc.html());
  }
};

module.exports = juice;

/**
 * Package version
 */

juice.version = packageJson.version;

/**
 * Export Selector.
 */

juice.Selector = Selector;

/**
 * Export Property.
 */

juice.Property = Property;

/**
 * Export utils.
 */

juice.utils = require('./utils');


juice.ignoredPseudos = ['hover', 'active', 'focus', 'visited', 'link'];
juice.widthElements = ['TABLE', 'TD', 'IMG'];
juice.tableElements = ['TABLE', 'TD', 'TH', 'TR', 'TD', 'CAPTION', 'COLGROUP', 'COL', 'THEAD', 'TBODY', 'TFOOT'];
juice.nonVisualElements = [ "HEAD", "TITLE", "BASE", "LINK", "STYLE", "META", "SCRIPT", "NOSCRIPT" ];
juice.styleToAttribute = {
  'background-color': 'bgcolor',
  'background-image': 'background',
  'text-align': 'align',
  'vertical-align': 'valign'
};

juice.juiceDocument = juiceDocument;
juice.juiceResources = juiceResources;
juice.juiceFile = juiceFile;
juice.inlineDocument = inlineDocument;
juice.inlineContent = inlineContent;

function inlineDocument($, css, options) {

  var rules = utils.parseCSS(css);
  var editedElements = [];

  rules.forEach(handleRule);
  editedElements.forEach(setStyleAttrs);

  if (options && options.inlinePseudoElements) {
    editedElements.forEach(inlinePseudoElements);
  }

  if (options && options.applyWidthAttributes) {
    editedElements.forEach(setWidthAttrs);
  }

  if (options && options.applyAttributesTableElements) {
    editedElements.forEach(setAttributesOnTableElements);
  }

  function handleRule(rule) {
    var sel = rule[0];
    var style = rule[1];
    var selector = new Selector(sel);
    var parsedSelector = selector.parsed();
    var pseudoElementType = getPseudoElementType(parsedSelector);

    // skip rule if the selector has any pseudos which are ignored
    for (var i = 0; i < parsedSelector.length; ++i) {
      var subSel = parsedSelector[i];
      if (subSel.pseudos) {
        for (var j = 0; j < subSel.pseudos.length; ++j) {
          var subSelPseudo = subSel.pseudos[j];
          if (juice.ignoredPseudos.indexOf(subSelPseudo.name) >= 0) {
            return;
          }
        }
      }
    }

    if (pseudoElementType) {
      var last = parsedSelector[parsedSelector.length - 1];
      var pseudos = last.pseudos;
      last.pseudos = filterElementPseudos(last.pseudos);
      sel = parsedSelector.toString();
      last.pseudos = pseudos;
    }

    var els;
    try {
      els = $(sel);
    } catch (err) {
      // skip invalid selector
      return;
    }

    els.each(function () {
      var el = this;

      if (juice.nonVisualElements.indexOf(el.name.toUpperCase()) >= 0) {
          return;
      }

      if (pseudoElementType) {
        var pseudoElPropName = "pseudo" + pseudoElementType;
        var pseudoEl = el[pseudoElPropName];
        if (!pseudoEl) {
          pseudoEl = el[pseudoElPropName] = $("<span />").get(0);
          pseudoEl.pseudoElementType = pseudoElementType;
          pseudoEl.pseudoElementParent = el;
          el[pseudoElPropName] = pseudoEl;
        }
        el = pseudoEl;
      }

      if (!el.styleProps) {
        el.styleProps = {};

        // if the element has inline styles, fake selector with topmost specificity
        if ($(el).attr('style')) {
          var cssText = '* { ' + $(el).attr('style') + ' } ';
          addProps(utils.parseCSS(cssText)[0][1], styleSelector);
        }

        // store reference to an element we need to compile style="" attr for
        editedElements.push(el);
      }

      // go through the properties
      function addProps (style, selector) {
        for (var i = 0, l = style.length; i < l; i++) {
          var name = style[i];
          var value = style[name] + (options && options.preserveImportant && style._importants[name] ? ' !important' : '');
          var sel = style._importants[name] ? importantSelector : selector;
          var prop = new Property(name, value, sel);
          var existing = el.styleProps[name];

          if (existing && existing.compare(prop) === prop || !existing) {
            el.styleProps[name] = prop;
          }
        }
      }

      addProps(style, selector);
    });
  }

  function setStyleAttrs(el) {
    var props = Object.keys(el.styleProps).map(function(key) {
      return el.styleProps[key];
    });
    // sort properties by their originating selector's specificity so that
    // props like "padding" and "padding-bottom" are resolved as expected.
    props.sort(function(a, b) {
      return a.selector.specificity().join("").localeCompare(
        b.selector.specificity().join(""));
    });
    var string = props
      .filter(function(prop) {
        // Content becomes the innerHTML of pseudo elements, not used as a
        // style property
        return prop.prop !== "content";
      })
      .map(function(prop) {
        return prop.prop + ": " + prop.value.replace(/["]/g, "'") + ";";
      })
      .join(" ");
    if (string) {
      $(el).attr('style', string);
    }
  }

  function inlinePseudoElements(el) {
    if (el.pseudoElementType && el.styleProps.content) {
      $(el).html(parseContent(el.styleProps.content.value));
      var parent = el.pseudoElementParent;
      if (el.pseudoElementType === "before") {
        $(parent).prepend(el);
      }
      else {
        $(parent).append(el);
      }
    }
  }

  function setWidthAttrs(el) {
    var elName = el.name.toUpperCase();
    if (juice.widthElements.indexOf(elName) > -1) {
      for (var i in el.styleProps) {
        if (el.styleProps[i].prop === 'width' && el.styleProps[i].value.match(/px/)) {
          var pxWidth = el.styleProps[i].value.replace('px', '');
          $(el).attr('width', pxWidth);
          return;
        }
      }
    }
  }

  function setAttributesOnTableElements(el) {
    var elName = el.name.toUpperCase(),
        styleProps = Object.keys(juice.styleToAttribute);

    if (juice.tableElements.indexOf(elName) > -1) {
      for (var i in el.styleProps) {
        if (styleProps.indexOf(el.styleProps[i].prop) > -1) {
          $(el).attr(juice.styleToAttribute[el.styleProps[i].prop], el.styleProps[i].value);
        }
      }
    }
  }
}

function parseContent(content) {
  if (content === "none" || content === "normal") {
    return "";
  }

  // Naive parsing, assume well-formed value
  content = content.slice(1, content.length - 1);
  // Naive unescape, assume no unicode char codes
  content = content.replace(/\\/g, "");
  return content;
}

// Return "before" or "after" if the given selector is a pseudo element (e.g.,
// a::after).
function getPseudoElementType(selector) {
  if (selector.length === 0) {
    return;
  }

  var pseudos = selector[selector.length - 1].pseudos;
  if (!pseudos) {
    return;
  }

  for (var i = 0; i < pseudos.length; i++) {
    if (isPseudoElementName(pseudos[i])) {
      return pseudos[i].name;
    }
  }
}

function isPseudoElementName(pseudo) {
  return pseudo.name === "before" || pseudo.name === "after";
}

function filterElementPseudos(pseudos) {
  return pseudos.filter(function(pseudo) {
    return !isPseudoElementName(pseudo);
  });
}

function juiceDocument($, options) {
  options = getDefaultOptions(options);
  var css = extractCssFromDocument($, options);
  css += "\n" + options.extraCss;
  inlineDocument($, css, options);
  return $;
}

function juiceResources(html, options, callback) {
  options = getDefaultOptions(options);

  var onInline = function(err, html) {
    if(err){
      return callback(err);
    }

    var $ = utils.cheerio(html, { xmlMode: options && options.xmlMode});
    juiceDocument($, options);

    if (options.xmlMode){
      return callback(null, $.xml());
    }
    else {
      return callback(null, utils.decodeEntities($.html()));
    }
  };

  options.webResources.relativeTo = options.webResources.relativeTo || options.url; //legacy support
  utils.inlineExternal(html, options.webResources, onInline);
}

function getDefaultOptions(options) {
  var result = utils.extend({
    extraCss: "",
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: false,
    preserveFontFaces: false,
    applyWidthAttributes: false,
    applyAttributesTableElements: false,
    url: ""
  }, options);

  result.webResources = result.webResources || {};

  return result;
}

function juiceFile(filePath, options, callback) {
  // set default options
  fs.readFile(filePath, 'utf8', function(err, content) {
    if (err) {
      return callback(err);
    }
    options = getDefaultOptions(options); // so we can mutate options without guilt
    if(!options.webResources.relativeTo){
      var rel = path.dirname(path.relative(process.cwd(),filePath));
      options.webResources.relativeTo = rel;
    }
    juiceResources(content, options, callback);
  });
}

function inlineContent(html, css, options) {
    var $ = utils.cheerio(html, { xmlMode: options && options.xmlMode});
    inlineDocument($, css, options);

    if (options && options.xmlMode){
      return $.xml();
    }
    else {
      return utils.decodeEntities($.html());
    }
}

function getStylesData($, options) {
  var results = [];
  var stylesList = $("style");
  var styleDataList, styleData, styleElement;
  stylesList.each(function () {
    styleElement = this;
    styleDataList = styleElement.childNodes;
    if (styleDataList.length !== 1) {
      return;
    }
    styleData = styleDataList[0].data;
    if ( options.applyStyleTags ) {
      results.push( styleData );
    }
    if ( options.removeStyleTags )
    {
      var preservedText = utils.getPreservedText( styleElement.childNodes[0].nodeValue, {
          mediaQueries: options.preserveMediaQueries,
          fontFaces: options.preserveFontFaces
      } );
      if ( preservedText )
      {
        styleElement.childNodes[0].nodeValue = preservedText;
      }
      else
      {
        $(styleElement).remove();
      }
    }
  });
  return results;
}

function extractCssFromDocument($, options) {
  var results = getStylesData($, options);
  var css = results.join("\n");
  return css;
}
