
/**
 * juice
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

module.exports = exports = juice;

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , Selector = require('./selector')
  , Property = require('./property')

/**
 * Export Selector.
 */

exports.Selector = Selector;

/**
 * Export Property.
 */

exports.Property = Property;

/**
 * Export utils.
 */

exports.utils = require('./utils');

/**
 * Inlines the CSS specified by `css` into the `html`
 *
 * @param {String} html
 * @param {String} css
 * @api public
 */

function juice (html, css, options) {
  var rules = utils.parseCSS(css)
    , document = utils.jsdom(html)
    , editedElements = []
    , topmost = new Selector('<style attribute>', [1, 0, 0, 0])
    , options = options || {}

  rules.forEach(function (rule) {
    var sel = rule[0]
      , style = rule[1]
      , matches = document.querySelectorAll(sel)
      , selector

    utils.toArray(matches).forEach(function (el) {
      // we initialize the Selector lazily to avoid needless parsing
      if (!selector) selector = new Selector(sel)

      if (!el.styleProps) {
        el.styleProps = {}

        // if the element has inline styles, fake selector with topmost specificity
        if (el.attribs && el.attribs.style)
          addProps(
              utils.parseCSS(el.attribs.style)
            , topmost
          );

        // store reference to an element we need to compile style="" attr for
        editedElements.push(el);
      }

      // go through the properties
      function addProps (style, selector) {
        for (var i = 0, l = style.length; i < l; i++) {
          var name = style[i]
            , value = style[name]
            , sel = style._importants[name] 
                ? new Selector('!important', [2,0,0,0])
                : selector
            , prop = new Property(name, value, sel)
            , existing = el.styleProps[name]

          if (existing) {
            var winner = existing.compare(prop)
              , loser = prop == winner ? existing : prop

            if (winner == prop) el.styleProps[name] = prop;
          } else {
            el.styleProps[name] = prop;
          }
        }
      }

      addProps(style, selector);
    });
  });

  // set `style` attributes
  editedElements.forEach(function (el) {
    var style = '';
    for (var i in el.styleProps)
      style += el.styleProps[i].toString();
    el.setAttribute('style', style);
  });

  return document.body.innerHTML;
}
