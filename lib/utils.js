'use strict';

/**
 * Module dependencies.
 */

var mensch = require('mensch');
var cheerio = require('cheerio');
var own = {}.hasOwnProperty;
var os = require('os');
var Selector = require('./selector');
var Property = require('./property');

exports.Selector = Selector;
exports.Property = Property;

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
  var parsed = mensch.parse(css);
  var rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  var ret = [];

  for (var i = 0, l = rules.length; i < l; i++) {
    if (rules[i].type == 'rule') {
      var rule = rules[i];
      var selectors = rule.selectors;

      for (var ii = 0, ll = selectors.length; ii < ll; ii++) {
        ret.push([selectors[ii], rule.declarations]);
      }
    }
  }

  return ret;
};

var removeStyle = function(style, startPos, endPos, skipRows, startOffset, endOffset, insert) {
  var styleRows = style.split("\n");
  var start = startOffset;
  var end = endOffset;
  for (var r = 1 + skipRows; r < startPos.line; r++) start += styleRows[r - 1 - skipRows].length + 1;
  start += startPos.col;
  if (endPos !== null) {
    for (var r2 = 1 + skipRows; r2 < endPos.line; r2++) end += styleRows[r2 - 1 - skipRows].length + 1;
    end += endPos.col;
  } else end += style.length + 1;
  var newStyle = style.substr(0, start - 1) + insert + style.substr(end - 1);
  return newStyle;
};

/**
 * Returns preserved text for a CSS source.
 *
 * @param {String} css source
 * @param {Object} options
 * @api public
 */

exports.getPreservedText = function(css, options) {
  var parsed = mensch.parse(css, {position: true, comments: true});
  var rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  var preserved = css;
  var preserved2 = [];
  var lastStart = null;

  for (var i = rules.length - 1; i >= 0; i--) {
    if (options.fontFaces && rules[i].type === 'font-face') {
      // preserve
      preserved2.push(mensch.stringify({ stylesheet: { rules: [ rules[i] ] }}, { comments: false, indentation: '    ' }).replace(/}/,os.EOL+'}'));
    } else if (options.mediaQueries && rules[i].type === 'media') {
      // preserve
      preserved2.push(mensch.stringify({ stylesheet: { rules: [ rules[i] ] }}, { comments: false, indentation: '  ' }));
    } else {
      // remove
      preserved = removeStyle(preserved, rules[i].position.start, lastStart, 0, 0, 0, '');
    // TODO +os.EOL?
    }
    lastStart = rules[i].position.start;
  }
  // preserved works by removing unwanted stuff, preserved2 by generating a new style with "stuff to keep"
  // We have to decide what is our strategy (the preserved2 produces the same output of the cssom based version <= 2.0.0)
  if (false) {
    if (preserved.trim().length === 0) return false;
    return preserved;
  } else {
    if (preserved2.length === 0) return false;
    return os.EOL+preserved2.join(os.EOL)+os.EOL;
  }
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
  // NOTE this consider multiple newlines the same as a single newline
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n').replace(/\r\n\r\n/g, '\r\n');
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
 * Compares two specificity vectors, returning the winning one.
 *
 * @param {Array} vector a
 * @param {Array} vector b
 * @return {Array}
 * @api public
 */

exports.compareFunc = function(a, b) {
  for (var i = 0; i < 4; i++) {
    if (a[i] === b[i]) { continue; }
    if (a[i] > b[i]) { return 1; }
    return -1;
  }

  return 0;
};

exports.compare = function(a, b) {
  return exports.compareFunc(a, b) == 1 ? a : b;
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
    insertPreservedExtraCss: true,
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    applyWidthAttributes: true,
    applyHeightAttributes: true,
    applyAttributesTableElements: true,
    url: ''
  }, options);

  result.webResources = result.webResources || {};

  return result;
}
