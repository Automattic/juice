
/**
 * juice
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

var juice = function (html,options) {
  var $ = utils.cheerio(html);
  return juiceDocument($,options).html();
};

module.exports = juice;

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , Selector = require('./selector')
  , Property = require('./property')
  , packageJson = require('../package')
  , fs = require('fs')
  , path = require('path')
  , assert = require('assert')
  , styleSelector = new Selector('<style attribute>', [1, 0, 0, 0])
  , importantSelector = new Selector('<!important>', [2, 0, 0, 0]);

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

juice.juiceDocument = juiceDocument;
juice.juiceResources = juiceResources;
juice.juiceFile = juiceFile;
juice.inlineDocument = inlineDocument;
juice.inlineContent = inlineContent;

function inlineDocument($, css, options) {

  var rules = utils.parseCSS(css)
    , editedElements = [];

  rules.forEach(handleRule);
  editedElements.forEach(setStyleAttrs);

  if (options && options.applyWidthAttributes) {
    editedElements.forEach(setWidthAttrs);
  }

  function handleRule(rule) {
    var sel = rule[0]
      , style = rule[1]
      , selector = new Selector(sel);

    // skip rule if the selector has any pseudos which are ignored
    var parsedSelector = selector.parsed();
    for (var i = 0; i < parsedSelector.length; ++i) {
      var subSel = parsedSelector[i];
      if (subSel.pseudos) {
        for (var j = 0; j < subSel.pseudos.length; ++j) {
          var subSelPseudo = subSel.pseudos[j];
          if (juice.ignoredPseudos.indexOf(subSelPseudo.name) >= 0) return;
        }
      }
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
      if (!el.styleProps) {
        el.styleProps = {}

        // if the element has inline styles, fake selector with topmost specificity
        if ($(el).attr('style')) {
          var cssText = '* { ' + $(el).attr('style') + ' } '
          addProps(utils.parseCSS(cssText)[0][1], styleSelector);
        }

        // store reference to an element we need to compile style="" attr for
        editedElements.push(el);
      }

      // go through the properties
      function addProps (style, selector) {
        for (var i = 0, l = style.length; i < l; i++) {
          var name = style[i]
            , value = style[name]
            , sel = style._importants[name] ? importantSelector : selector
            , prop = new Property(name, value, sel)
            , existing = el.styleProps[name];

          if (existing) {
            var winner = existing.compare(prop)
              , loser = prop === winner ? existing : prop

            if (winner === prop) el.styleProps[name] = prop;
          } else {
            el.styleProps[name] = prop;
          }
        }
      }

      addProps(style, selector);
    });
  }

  function setStyleAttrs(el) {
    var style = [];
    for (var i in el.styleProps) {
      style.push(el.styleProps[i].prop + ": " + el.styleProps[i].value.replace(/["]/g, "'") + ";");
    }
    // sorting will arrange styles like padding: before padding-bottom: which will preserve the expected styling
    style = style.sort( function ( a, b )
    {
      var aProp = a.split( ':' )[0];
      var bProp = b.split( ':' )[0];
      return ( aProp > bProp ? 1 : aProp < bProp ? -1 : 0 );
    } );
    $(el).attr('style', style.join(' '));
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

    var $ = utils.cheerio(html);
    juiceDocument($, options);
    callback(null, $.html());
  };

  utils.inlineExternal(html, options.webResources, onInline);
}

function getDefaultOptions(options) {
  var result = utils.extend({
    extraCss: "",
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: false,
    applyWidthAttributes: false,
  }, options);

  result.webResources = result.webResources || {};

  return result;
}

function juiceFile(filePath, options, callback) {
  // set default options
  fs.readFile(filePath, 'utf8', function(err, content) {
    if (err) return callback(err);
    options = getDefaultOptions(options); // so we can mutate options without guilt
    if(!options.webResources.relativeTo){
      var rel = path.dirname(path.relative(process.cwd(),filePath));
      options.webResources.relativeTo = rel;
    };
    juiceResources(content, options, callback);
  });
}

function inlineContent(html, css, options) {
    var $ = utils.cheerio(html);
    inlineDocument($, css, options);
    return $.html();
}

function getStylesData($, options) {
  var results = [];
  var stylesList = $("style");
  var i, styleDataList, styleData, styleElement;
  stylesList.each(function () {
    styleElement = this;
    styleDataList = styleElement.childNodes;
    if (styleDataList.length !== 1) {
      return;
    }
    styleData = styleDataList[0].data;
    if ( options.applyStyleTags ) results.push( styleData );
    if ( options.removeStyleTags )
    {
      if ( options.preserveMediaQueries )
      {
        var mediaQueries = utils.getMediaQueryText( styleElement.childNodes[0].nodeValue );
        styleElement.childNodes[0].nodeValue = mediaQueries;
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

