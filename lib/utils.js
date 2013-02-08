
/**
 * Module dependencies.
 */

var fs = require('fs')
  , cssom = require('cssom')
  , jsdom = require('jsdom')
  , own = {}.hasOwnProperty;

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from cssom
 * @api public
 */

exports.extract = function extract (selectorText) {
  var attr = 0
    , sels = []
    , sel = ''

  for (var i = 0, l = selectorText.length; i < l; i++) {
    var c = selectorText.charAt(i);

    if (attr) {
      if (']' === c || ')' === c) attr--;
      sel += c;
    } else {
      if (',' === c) {
        sels.push(sel);
        sel = '';
      } else {
        if ('[' === c || '(' === c) attr++;
        if (sel.length || (c !== ',' && c !== '\n' && c !== ' ')) sel += c;
      }
    }
  }

  if (sel.length) sels.push(sel);

  return sels;
}

/**
 * Returns a parse tree for a CSS source.
 * If it encounters multiple selectors separated by a comma, it splits the
 * tree.
 *
 * @param {String} css source
 * @api public
 */

exports.parseCSS = function (css) {
  var rules = cssom.parse(css).cssRules || []
    , ret = []

  for (var i = 0, l = rules.length; i < l; i++) {
    if (rules[i].selectorText) { // media queries don't have selectorText
      var rule = rules[i]
        , selectors = exports.extract(rule.selectorText)

      for (var ii = 0, ll = selectors.length; ii < ll; ii++) {
        ret.push([selectors[ii], rule.style]);
      }
    }
  }

  return ret;
}

/**
 * Returns a JSDom jQuery object
 *
 * api public
 */

exports.jsdom = function (html) {
  return jsdom.html(html, null, {
    features: {
        QuerySelector: ['1.0']
      , FetchExternalResources: false
      , ProcessExternalResources: false
      , MutationEvents: false
    }
  });
};

/**
 * Converts to array
 *
 * @api public
 */

exports.toArray = function (arr) {
  var ret = [];

  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(arr[i]);

  return ret;
};

/**
 * Compares two specificity vectors, returning the winning one.
 *
 * @param {Array} vector a
 * @param {Array} vector b
 * @return {Array}
 * @api public
 */

exports.compare = function (a, b) {
  for (var i = 0; i < 4; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] > b[i]) return a;
    return b;
  }

  return b;
}

exports.extend = function (obj, src) {
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
