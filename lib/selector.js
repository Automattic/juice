
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

  var parsed = parse(this.text)
    , expressions = parsed.expressions[0]
    , spec = [0, 0, 0, 0]
    , nots = []

  for (var i = 0; i < expressions.length; i++) {
    var expression = expressions[i], pseudos = expression.pseudos;

    // id awards a point in the second column
    if (expression.id) spec[1]++;

    // classes and attributes award a point each in the third column
    if (expression.attributes) spec[2] += expression.attributes.length;
    if (expression.classes) spec[2] += expression.classes.length;

    // tag awards a point in the fourth column
    if (expression.tag && expression.tag != '*') spec[3]++;

    // pseudos award a point each in the fourth column
    if (pseudos) {
      spec[3] += pseudos.length;

      for (var p = 0; p < pseudos.length; p++) {
        if (pseudos[p].key == 'not'){
          nots.push(pseudos[p].value);
          spec[3]--;
        }
      }
    }
  }

  for (var ii = nots.length; ii--;) {
    var not = specificity(nots[ii]);
    for (var jj = 4; jj--;) spec[jj] += not[jj];
  }

  return this.spec = spec;
}
