'use strict';

import parser from 'slick/parser.js';

/**
 * CSS selector constructor.
 *
 * @param {String} selector text
 * @param {Array} optionally, precalculated specificity
 * @api public
 */

export default function Selector(text, styleAttribute) {
  this.text = text;
  this.spec = undefined;
  this.styleAttribute = styleAttribute || false;
}

/**
 * Get parsed selector.
 *
 * @api public
 */

Selector.prototype.parsed = function() {
  if (!this.tokens) { this.tokens = parse(this.text); }
  return this.tokens;
};

/**
 * Lazy specificity getter
 *
 * @api public
 */

Selector.prototype.specificity = function() {
  const styleAttribute = this.styleAttribute;
  if (!this.spec) { this.spec = specificity(this.text, this.parsed()); }
  return this.spec;

  function specificity(text, parsed) {
    const expressions = parsed || parse(text);
    const spec = [styleAttribute ? 1 : 0, 0, 0, 0];
    const nots = [];

    for (let i = 0; i < expressions.length; i++) {
      const expression = expressions[i];
      const pseudos = expression.pseudos;

      // id awards a point in the second column
      if (expression.id) { spec[1]++; }

      // classes and attributes award a point each in the third column
      if (expression.attributes) { spec[2] += expression.attributes.length; }
      if (expression.classList) { spec[2] += expression.classList.length; }

      // tag awards a point in the fourth column
      if (expression.tag && expression.tag !== '*') { spec[3]++; }

      // pseudos award a point each in the fourth column
      if (pseudos) {
        spec[3] += pseudos.length;

        for (let p = 0; p < pseudos.length; p++) {
          if (pseudos[p].name === 'not') {
            nots.push(pseudos[p].value);
            spec[3]--;
          }
        }
      }
    }

    for (let ii = nots.length; ii--;) {
      const not = specificity(nots[ii]);
      for (let jj = 4; jj--;) { spec[jj] += not[jj]; }
    }

    return spec;
  }
};

/**
 * Parses a selector and returns the tokens.
 *
 * @param {String} selector
 * @api private.
 */

function parse(text) {
  try {
    return parser(text)[0];
  } catch (e) {
    return [];
  }
}
