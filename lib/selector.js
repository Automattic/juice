'use strict';

import selectorParser from 'postcss-selector-parser';

const processor = selectorParser();

/**
 * CSS selector constructor.
 *
 * @param {String} selector text
 * @param {Boolean} styleAttribute true when the selector originates from a style="" attribute
 * @api public
 */

export default function Selector(text, styleAttribute) {
  this.text = text;
  this.spec = undefined;
  this.styleAttribute = styleAttribute || false;
}

/**
 * Get parsed selector AST (postcss-selector-parser Root).
 *
 * @api public
 */

Selector.prototype.parsed = function() {
  if (this.ast !== undefined) return this.ast;
  try {
    this.ast = processor.astSync(this.text);
  } catch (e) {
    this.ast = null;
  }
  return this.ast;
};

/**
 * Lazy specificity getter.
 *
 * Returns a 4-tuple [styleAttr, ids, classes/attrs, types/pseudos] matching the
 * shape used by Property#compareFunc and the consumer in lib/inline.js.
 *
 * @api public
 */

Selector.prototype.specificity = function() {
  if (this.spec) return this.spec;
  const root = this.parsed();
  const styleAttribute = this.styleAttribute;

  if (!root || root.nodes.length === 0) {
    this.spec = [styleAttribute ? 1 : 0, 0, 0, 0];
    return this.spec;
  }

  // juice has always computed specificity from the first comma-arm only
  // (slick's `parser(text)[0]`). postcss-selector-parser preserves the
  // same shape: root.nodes[0] is the first Selector.
  this.spec = computeSpecificity(root.nodes[0], styleAttribute);
  return this.spec;
};

function computeSpecificity(selectorNode, styleAttribute) {
  const spec = [styleAttribute ? 1 : 0, 0, 0, 0];

  selectorNode.each((node) => {
    switch (node.type) {
      case 'id':
        spec[1]++;
        break;
      case 'class':
      case 'attribute':
        spec[2]++;
        break;
      case 'tag':
        if (node.value !== '*') spec[3]++;
        break;
      case 'pseudo':
        // Treat :not() like slick did: skip counting the pseudo itself,
        // recurse into its first comma-arm only and add that specificity.
        // (Per spec :is/:has should do the same and :where should contribute 0,
        // but that's a deliberate follow-up; this PR preserves current behavior.)
        if (node.value === ':not' && node.nodes && node.nodes.length) {
          const innerSpec = computeSpecificity(node.nodes[0], false);
          for (let i = 0; i < 4; i++) spec[i] += innerSpec[i];
        } else {
          spec[3]++;
        }
        break;
      // combinator, comment, nesting, root: no specificity contribution
    }
  });

  return spec;
}
