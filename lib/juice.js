
/**
 * juice
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

module.exports = exports = juice;

/**
 * Module dependencies.
 */

var soupselect = require('soupselect')
  , utils = require('./utils')
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
    , dom = utils.parseHTML(html)
    , editedElements = []
    , topmost = new Selector('<style attribute>', [1, 0, 0, 0])
    , options = options || {}

  function select (sel) {
    return soupselect.select(dom, sel);
  }

  rules.forEach(function (rule) {
    var sel = rule[0]
      , style = rule[1]
      , matches = select(sel)
      , selector

    if (options.log)
      console.log('\ngot selector "%s" - matches: %s ', sel, matches.length);

    matches.forEach(function (el) {
      // we initialize the Selector lazily to avoid needless parsing
      if (!selector) {
        selector = new Selector(sel)

        if (options.log)
          console.log(
              'selector "%s" has specificity "%s"'
            , sel
            , JSON.stringify(selector.specificity())
          );
      }

      if (!el.styleProps) {
        el.styleProps = {}

        // if the element has inline styles, fake selector with topmost specificity
        if (el.attribs && el.attribs.style) {
          if (options.log)
            console.log('element has inline style - caching properties');

          addProps(
              utils.parseCSS(el.attribs.style)
            , topmost
          );
        }

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

            if (options.log)
              console.log(
                  '  - "%s" already existing from selector "%s", selector "%s" beats "%s"'
                , name
                , existing.selector.text
                , winner.selector.text
                , loser.selector.text
              );

            if (winner == prop && options.log) {
              console.log('  + new value "%s"', value);
            }
          } else {
            el.styleProps[name] = prop;
            if (options.log)
              console.log(' - property "%s" added with value "%s"', name, value);
          }
        }
      }

      addProps(style, selector);
    });
  });

  if (options.log)
    console.log('elements affected "%s"', editedElements.length);

  editedElements.forEach(function (el) {
    var style = '';

    for (var i in el.styleProps) {
      style += el.styleProps[i].toString();
    }

    if (!el.attribs) el.attribs = {};

    el.attribs.style = style;
  });

  return utils.domToHTML(dom);
}
