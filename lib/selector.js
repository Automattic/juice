
/**
 * Module dependencies.
 */

var parse = require('mootools-slick-parser').Slick.parse

/**
 * Module exports.
 */

module.exports = exports = Selector;

/**
 * CSS selector constructor.
 *
 * @param {String} selector text
 * @param {Array} optionally, precalculated specificity
 * @api public
 */

function Selector (text, spec) {
  this.text = text;
  this.spec = spec;
}

/**
 * Lazy specificity getter
 *
 * @api public
 */

Selector.prototype.specificity = function () {
  if (this.spec) return this.spec;

  this.parsed = parse(this.text).expressions[0];
  this.spec = [0, 0, 0, 0];

  for (var i = 0, l = this.parsed.length; i < l; i++) {
    var token = this.parsed[i];

    // id awards a point in the second column
    if (undefined != token.id) this.spec[1]++;

    // classes award a point each in the third column
    if (token.classes) this.spec[2] += token.classes.length;

    // attributes award a point each in the third column
    if (token.attributes) this.spec[2] += token.attributes.length;

    // pseudos award a point each in the third column
    if (token.pseudos) this.spec[2] += token.pseudos.length;

    // tag awards a point in the fourth column
    if ('*' != token.tag) this.spec[3]++;
  }

  return this.spec;
}
