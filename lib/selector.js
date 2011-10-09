
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

var specificity = function (text) {
  var parsed = parse(text);
  var expressions = parsed.expressions;
  var spec = [0, 0, 0, 0];
  for (var j = 0; j < expressions.length; j++) {
    var b = 0, c = 0, d = 0, s = [], nots = [];
    for (var i = 0; i < expressions[j].length; i++) {
      var expression = expressions[j][i], pseudos = expression.pseudos;

      // id awards a point in the second column
      if (expression.id) b++;

      // classes and attributes award a point each in the third column
      if (expression.attributes) c += expression.attributes.length;
      if (expression.classes) c += expression.classes.length;

      // tag awards a point in the fourth column
      if (expression.tag && expression.tag != '*') d++;

      // pseudos award a point each in the fourth column
      if (pseudos) {
        d += pseudos.length;
        for (var p = 0; p < pseudos.length; p++) if (pseudos[p].key == 'not'){
          nots.push(pseudos[p].value);
          d--;
        }
      }
    }
    s = [0, b, c, d];
    for (var ii = nots.length; ii--;) {
      var not = specificity(nots[ii]);
      for (var jj = 4; jj--;) s[jj] += not[jj];
    }
    if (s.join('') > spec.join('')) spec = s;
  }
  return spec;
}

/**
 * Lazy specificity getter
 *
 * @api public
 */

Selector.prototype.specificity = function () {
  if (this.spec == null) this.spec = specificity(this.text);
  return this.spec;
}
