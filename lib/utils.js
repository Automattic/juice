
/**
 * Module dependencies.
 */

var cssom = require('cssom')
  , htmlparser = require('htmlparser')

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from cssom
 * @api public
 */

exports.extract = function extract (selectorText) {
  var attr = false
    , sels = []
    , sel = ''

  for (var i = 0, l = selectorText.length; i < l; i++) {
    var c = selectorText.charAt(i);

    if (attr) {
      if (']' == c) attr = false;
      sel += c;
    } else {
      if (',' == c) {
        sels.push(sel);
        sel = '';
      } else {
        if ('[' == c) attr = true;
        if (sel.length || (c != ',' && c != ' ')) sel += c;
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
    var rule = rules[i]
      , selectors = exports.extract(rule.selectorText)

    for (var ii = 0, ll = selectors.length; ii < ll; ii++) {
      ret.push([selectors[ii], rule.style]);
    }
  }

  return ret;
}

/**
 * Parses HTML and returns the DOM.
 *
 * @param {String} html
 * @return {DOM}
 * @api public
 */

exports.parseHTML = function (html) {
  var handler = new htmlparser.DefaultHandler(function (err) {
        if (err) throw err;
      })
    , parser = new htmlparser.Parser(handler)

  parser.parseComplete(html);
  return handler.dom;
};

/**
 * Outputs HTML from the dom
 *
 * @param {Array} dom (from htmlparser)
 * @api public
 */

var selfClosing = [
    'meta'
  , 'img'
  , 'link'
  , 'input'
  , 'area'
  , 'base'
  , 'col'
  , 'br'
  , 'hr'
];

exports.domToHTML = function (dom) {
  var html = '';

  for (var i = 0, l = dom.length; i < l; i++) {
    var el = dom[i];

    if ('tag' == el.type) {
      html += '<' + el.name;

      if (el.attribs)
        for (var i in el.attribs)
          html += ' ' + i + '="' + exports.escape(el.attribs[i]) + '"';

      html += '>';

      if (el.children)
        html += exports.domToHTML(el.children);

      if (!~selfClosing.indexOf(el.name))
        html += '</' + el.name + '>';
    } else if ('text' == el.type) {
      html += el.data;
    } else {
      throw new Error('Unknown type: ' + el.type);
    }
  }

  return html;
}

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
