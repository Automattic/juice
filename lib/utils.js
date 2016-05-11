'use strict';

/**
 * Module dependencies.
 */

var cssom = require('cssom');
var cheerio = require('cheerio');
var own = {}.hasOwnProperty;
var os = require('os');
var deprecate = require('util-deprecate');
var Selector = require('./selector');
var Property = require('./property');

exports.Selector = Selector;
exports.Property = Property;
exports.styleSelector = new Selector('<style attribute>', [1, 0, 0, 0]);

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from cssom
 * @api public
 */

exports.extract = function extract(selectorText) {
  var attr = 0;
  var sels = [];
  var sel = '';

  for (var i = 0, l = selectorText.length; i < l; i++) {
    var c = selectorText.charAt(i);

    if (attr) {
      if (']' === c || ')' === c) { attr--; }
      sel += c;
    } else {
      if (',' === c) {
        sels.push(sel);
        sel = '';
      } else {
        if ('[' === c || '(' === c) { attr++; }
        if (sel.length || (c !== ',' && c !== '\n' && c !== ' ')) { sel += c; }
      }
    }
  }

  if (sel.length) {
    sels.push(sel);
  }

  return sels;
};

/**
 * Returns a parse tree for a CSS source.
 * If it encounters multiple selectors separated by a comma, it splits the
 * tree.
 *
 * @param {String} css source
 * @api public
 */

exports.parseCSS = function(css) {
  var rules = cssom.parse(css).cssRules || [];
  var ret = [];

  for (var i = 0, l = rules.length; i < l; i++) {
    if (rules[i].selectorText) { // media queries don't have selectorText
      var rule = rules[i];
      var selectors = exports.extract(rule.selectorText);

      for (var ii = 0, ll = selectors.length; ii < ll; ii++) {
        ret.push([selectors[ii], rule.style]);
      }
    }
  }

  return ret;
};


var getStringifiedStyles = function(rule) {
  var styles = [];
  for (var style = 0; style < rule.style.length; style++) {
    var property = rule.style[style];
    var value = rule.style[property];
    var important = rule.style._importants[property] ? ' !important' : '';
    styles.push('    ' + property + ': ' + value + important + ';');
  }
  return styles;
};

/**
 * Returns preserved text for a CSS source.
 *
 * @param {String} css source
 * @param {Object} options
 * @api public
 */

exports.getPreservedText = function(css, options) {
  var rules = cssom.parse(css).cssRules || [];
  var preserved = [];

  for (var i = 0, l = rules.length; i < l; i++) {
    /* CSS types
      STYLE: 1,
      IMPORT: 3,
      MEDIA: 4,
      FONT_FACE: 5,
    */

    if (options.fontFaces && rules[i].type === cssom.CSSFontFaceRule.prototype.type) {
      var fontFace = [ '' ];
      fontFace.push('@font-face {');
      fontFace = fontFace.concat(getStringifiedStyles(rules[i]));
      fontFace.push('}');

      if (fontFace.length) {
        preserved.push(fontFace.length ? fontFace.join(os.EOL) + os.EOL : '');
      }
    }

    if (options.mediaQueries && rules[i].type === cssom.CSSMediaRule.prototype.type) {
      var query = rules[i];
      var queryString = [];

      queryString.push(os.EOL + '@media ' + query.media[0] + ' {');

      for (var ii = 0, ll = query.cssRules.length; ii < ll; ii++) {
        var rule = query.cssRules[ii];

        if (rule.type === cssom.CSSStyleRule.prototype.type
            || rule.type === cssom.CSSFontFaceRule.prototype.type) {
          queryString.push('  '
            + (rule.type === cssom.CSSStyleRule.prototype.type ? rule.selectorText : '@font-face') + ' {');
          queryString = queryString.concat(getStringifiedStyles(rule));
          queryString.push('  }');
        }
      }

      queryString.push('}');
      preserved.push(queryString.length ? queryString.join(os.EOL) + os.EOL : '');
    }
  }

  return preserved.join(os.EOL);
};

/**
 * Returns a Cheerio object
 *
 * api public
 */

exports.cheerio = function(html, options) {
  options = exports.extend({decodeEntities: false}, options || {});
  html = exports.encodeEntities(html);
  return cheerio.load(html,options);
};

exports.normalizeLineEndings = function(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

exports.encodeEJS = function(html) {
  return html.replace(/<%((.|\s)*?)%>/g, function(match, subMatch) {
    return '<!--EJS <%' + subMatch + '%> -->';
  });
};

exports.decodeEJS = function(html) {
  return html.replace(/<!--EJS <%((.|\s)*?)%> -->/g, function(match, subMatch) {
    return '<%' + subMatch + '%>';
  });
};

exports.encodeEntities = function(html) {
  return exports.encodeEJS(html);
};

exports.decodeEntities = function(html) {
  return exports.decodeEJS(html);
};

/**
 * Converts to array
 *
 * @api public
 */

exports.toArray = deprecate(function(arr) {
  var ret = [];

  for (var i = 0, l = arr.length; i < l; i++) {
    ret.push(arr[i]);
  }

  return ret;
}, 'utils.toArray: Will be removed in a future version');

/**
 * Compares two specificity vectors, returning the winning one.
 *
 * @param {Array} vector a
 * @param {Array} vector b
 * @return {Array}
 * @api public
 */

exports.compare = function(a, b) {
  for (var i = 0; i < 4; i++) {
    if (a[i] === b[i]) { continue; }
    if (a[i] > b[i]) { return a; }
    return b;
  }

  return b;
};

exports.extend = function(obj, src) {
  for (var key in src) {
    if (own.call(src, key)) {
      obj[key] = src[key];
    }
  }
  return obj;
};

exports.getDefaultOptions = function(options) {
  var result = exports.extend({
    extraCss: '',
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: false,
    preserveFontFaces: false,
    applyWidthAttributes: false,
    applyHeightAttributes: false,
    applyAttributesTableElements: false,
    url: ''
  }, options);

  result.webResources = result.webResources || {};

  return result;
}
