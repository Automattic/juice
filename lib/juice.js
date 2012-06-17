
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
 * Package version
 */

exports.version = '0.0.6';

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
 * Ignored pseudo-selectors.
 *
 */

exports.ignoredPseudos = ['hover', 'active', 'focus', 'visited', 'link'];

/**
 * Inlines the CSS specified by `css` into the `html`
 *
 * @param {String} html
 * @param {String} css
 * @api public
 */

var styleSelector = new Selector('<style attribute>', [1, 0, 0, 0])
  , importantSelector = new Selector('<!important>', [2, 0, 0, 0])

function juice (html, css, options) {
  var rules = utils.parseCSS(css)
    , document = utils.jsdom(html)
    , editedElements = []
    , options = options || {}

  rules.forEach(function (rule) {
    var sel = rule[0]
      , style = rule[1]
      , selector = new Selector(sel)

    if (selector.parsed().some(function (sel) {
      return sel.pseudos && sel.pseudos.some(function (pseudo) {
        return ~exports.ignoredPseudos.indexOf(pseudo.key);
      });
    })) return;

    utils.toArray(document.querySelectorAll(sel)).forEach(function (el) {
      if (!el.styleProps) {
        el.styleProps = {}

        // if the element has inline styles, fake selector with topmost specificity
        if (el.getAttribute('style')) {
          var cssText = '* { ' + el.getAttribute('style') + ' } '
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

  return document.innerHTML;
}
