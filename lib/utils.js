/**
 * Module dependencies.
 */

import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import nesting from 'postcss-nesting';
import Selector from './selector.js';
import Property from './property.js';

export { Selector, Property };

// Reusable PostCSS processor that flattens nested CSS rules (CSS Nesting
// Module Level 1) into their plain equivalents before juice's existing
// flat-rule logic processes them. On already-flat CSS this is a no-op.
const nestingProcessor = postcss([nesting()]);

function parseRoot(css, { strict = false } = {}) {
  return nestingProcessor.process(css, {
    parser: strict ? undefined : safeParser,
    from: undefined,
  }).root;
}

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from the CSS source
 * @api public
 */

export function extract(selectorText) {
  let attr = 0;
  const sels = [];
  let sel = '';

  for (let i = 0, l = selectorText.length; i < l; i++) {
    const c = selectorText.charAt(i);

    if (attr) {
      if (']' === c || ')' === c) { attr--; }
      sel += c;
    } else {
      if (',' === c) {
        sels.push(sel);
        sel = '';
      } else {
        if ('[' === c || '(' === c) { attr++; }
        if (sel.length || (c !== ',' && c !== '\n' && c !== ' ')) { sel += c; }
      }
    }
  }

  if (sel.length) {
    sels.push(sel);
  }
  return sels;
}

// Translate a PostCSS Declaration node into the legacy shape that lib/inline.js
// consumes. Keeps inline.js untouched by the parser swap.
function declToLegacy(decl) {
  const start = decl.source && decl.source.start;
  const end = decl.source && decl.source.end;
  return {
    type: 'property',
    name: decl.prop,
    value: decl.value + (decl.important ? ' !important' : ''),
    position: {
      start: { line: start ? start.line : 1, col: start ? start.column : 1 },
      end: { line: end ? end.line : 1, col: end ? end.column : 1 }
    }
  };
}

/**
 * Returns a parse tree for a CSS source.
 * If it encounters multiple selectors separated by a comma, it splits the tree.
 *
 * @param {String} css source
 * @api public
 */

export function parseCSS(css, { strict = false } = {}) {
  let root;
  try {
    root = parseRoot(css, { strict });
  } catch (e) {
    if (strict) throw e;
    return [];
  }

  const ret = [];
  const nodes = root.nodes;
  let ignoring = false;
  let ignoreEntireFile = false;

  // Check if the first node is a comment that ignores the entire file
  if (nodes.length > 0 && nodes[0].type === 'comment' && nodes[0].text) {
    if (nodes[0].text.trim() === 'juice ignore') {
      ignoreEntireFile = true;
    }
  }

  if (ignoreEntireFile) {
    return ret;
  }

  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = nodes[i];

    if (node.type === 'comment') {
      if (!node.text) continue;
      const comment = node.text.trim();

      if (comment === 'juice start ignore') {
        ignoring = true;
      } else if (comment === 'juice end ignore') {
        ignoring = false;
      } else if (comment === 'juice ignore next') {
        // Skip the next node
        i++;
      }
      continue;
    }

    if (ignoring) continue;

    if (node.type === 'rule') {
      const selectors = node.selectors;

      // Filter declarations: skip those flagged with a preceding "juice ignore next"
      const filtered = [];
      let skipNext = false;
      for (const child of node.nodes) {
        if (child.type === 'comment' && child.text && child.text.trim() === 'juice ignore next') {
          skipNext = true;
          continue;
        }
        if (skipNext && child.type === 'decl') {
          skipNext = false;
          continue;
        }
        if (child.type === 'decl') {
          // mensch silently dropped declarations with empty values; preserve that.
          if (child.value && child.value.trim()) {
            filtered.push(declToLegacy(child));
          }
        }
      }

      if (filtered.length > 0) {
        for (const sel of selectors) {
          ret.push([sel, filtered]);
        }
      }
    }
  }

  return ret;
}

/**
 * Returns preserved text for a CSS source.
 *
 * @param {String} css source
 * @param {Object} options
 * @param {Array} ignoredPseudos
 * @api public
 */

export function getPreservedText(css, options, ignoredPseudos) {
  let root;
  try {
    root = parseRoot(css);
  } catch (e) {
    return false;
  }

  const nodes = root.nodes;

  // Whole-file ignore directive
  if (nodes.length > 0 && nodes[0].type === 'comment' && nodes[0].text && nodes[0].text.trim() === 'juice ignore') {
    return '\n' + css + '\n';
  }

  // Identify rules that should be preserved due to "juice ignore next" markers
  // (either at the top level pointing at the next rule, or inside a rule body).
  const ignoredRuleIndices = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'comment' && node.text && node.text.trim() === 'juice ignore next' && i + 1 < nodes.length) {
      ignoredRuleIndices.add(i + 1);
    }
    if (node.type === 'rule' && node.nodes) {
      for (const child of node.nodes) {
        if (child.type === 'comment' && child.text && child.text.trim() === 'juice ignore next') {
          ignoredRuleIndices.add(i);
          break;
        }
      }
    }
  }

  // Walk backward to assemble preserved nodes in original order.
  const preserved = [];
  let ignoring = false;
  let ignoreBlock = [];

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];

    if (node.type === 'comment') {
      if (!node.text) continue;
      const comment = node.text.trim();

      if (comment === 'juice end ignore') {
        ignoring = true;
        ignoreBlock.push(node);
      } else if (comment === 'juice start ignore') {
        ignoring = false;
        ignoreBlock.push(node);
        if (ignoreBlock.length > 0) {
          preserved.unshift(stringifyNodes(ignoreBlock.slice().reverse()));
          ignoreBlock = [];
        }
      }
      // "juice ignore next" comments themselves are skipped
      continue;
    }

    if (ignoring) {
      ignoreBlock.push(node);
      continue;
    }

    if (ignoredRuleIndices.has(i)) {
      preserved.unshift(stringifyNodes([node]));
      continue;
    }

    const isFontFace = node.type === 'atrule' && node.name === 'font-face';
    const isMedia = node.type === 'atrule' && node.name === 'media';
    const isKeyframes = node.type === 'atrule' && /^(-\w+-)?keyframes$/.test(node.name);
    const isContainer = node.type === 'atrule' && node.name === 'container';
    const isLayer = node.type === 'atrule' && node.name === 'layer';
    const ruleSelectors = node.type === 'rule' ? node.selectors : null;

    if ((options.fontFaces && isFontFace) ||
        (options.mediaQueries && isMedia) ||
        (options.containerQueries && isContainer) ||
        (options.layers && isLayer) ||
        (options.keyFrames && isKeyframes) ||
        (options.pseudos && ruleSelectors && matchesPseudo(ruleSelectors[0], ignoredPseudos)) ||
        (options.preservedSelectors && ruleSelectors && ruleSelectors.some((sel) => matchesPreservedSelector(sel, options.preservedSelectors)))) {
      preserved.unshift(stringifyNodes([node]));
    }
  }

  if (preserved.length === 0) {
    return false;
  }
  return '\n' + preserved.join('\n') + '\n';
}

// Normalize PostCSS raws to match the mensch-with-`indentation:'  '` output
// shape that juice has always produced: each rule on its own line, 2-space
// indented declarations, depth-aware indentation for nested at-rules.
function normalizeRaws(node, depth, isFirst) {
  const indent = '  '.repeat(depth);
  if (!node.raws) node.raws = {};
  switch (node.type) {
    case 'rule':
    case 'atrule':
      node.raws.before = isFirst ? '' : '\n' + indent;
      if (node.nodes) {
        // body-having: `selector { ... }` / `@name params { ... }`
        node.raws.between = ' ';
        node.raws.after = '\n' + indent;
        node.raws.semicolon = true;
        node.nodes.forEach((child) => normalizeRaws(child, depth + 1, false));
      } else {
        // body-less at-rule (e.g., `@layer foo;`, `@import url(...);`):
        // PostCSS auto-appends `;` for bodyless atrules; we just need to
        // leave `between`/`after` untouched so the stringifier handles it.
        node.raws.between = '';
      }
      break;
    case 'decl':
      node.raws.before = '\n' + indent;
      node.raws.between = ': ';
      break;
    case 'comment':
      node.raws.before = isFirst ? '' : '\n' + indent;
      break;
  }
}

function stringifyNodes(nodeList) {
  const out = postcss.root();
  // Tell PostCSS to emit a trailing `;` after the last child — relevant for
  // bodyless at-rules like `@layer foo;` and the closing decl of a rule.
  out.raws.semicolon = true;
  nodeList.forEach((n, i) => {
    const clone = n.clone();
    normalizeRaws(clone, 0, i === 0);
    out.append(clone);
  });
  return out.toString();
}

export function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

export function matchesPseudo(needle, haystack) {
  return haystack.find(function (element) {
    return needle.indexOf(':' + element) > -1;
  });
}

/**
 * Checks if a selector matches any pattern in the preservedSelectors array.
 *
 * @param {String} selector
 * @param {Array} preservedSelectors
 * @api public
 */

export function matchesPreservedSelector(selector, preservedSelectors) {
  if (!preservedSelectors || preservedSelectors.length === 0) {
    return false;
  }

  for (let i = 0; i < preservedSelectors.length; i++) {
    const pattern = preservedSelectors[i];
    if (selector === pattern) return true;
    if (selector.indexOf(pattern) !== -1) return true;
  }

  return false;
}

/**
 * Removes inlined selectors from CSS and returns the remaining CSS.
 *
 * @param {String} css source
 * @param {Set} inlinedSelectors set of selectors that were inlined
 * @param {Object} options
 * @param {Array} ignoredPseudos
 * @api public
 */

export function removeInlinedSelectorsFromCSS(css, inlinedSelectors, options, ignoredPseudos) {
  let root;
  try {
    root = parseRoot(css);
  } catch (e) {
    return '';
  }

  const keep = [];

  for (const node of root.nodes) {
    // Always preserve non-rule types (at-rules, comments)
    if (node.type !== 'rule') {
      keep.push(node);
      continue;
    }

    // Keep rules with pseudos that were ignored during inlining
    if (options.preservePseudos && matchesPseudo(node.selectors[0], ignoredPseudos)) {
      keep.push(node);
      continue;
    }

    // Keep rules that match preservedSelectors
    if (options.preservedSelectors && node.selectors.some((sel) => matchesPreservedSelector(sel, options.preservedSelectors))) {
      keep.push(node);
      continue;
    }

    // Filter out selectors that were inlined
    const remainingSelectors = node.selectors.filter((sel) => !inlinedSelectors.has(sel));

    if (remainingSelectors.length > 0) {
      const clone = node.clone();
      clone.selectors = remainingSelectors;
      keep.push(clone);
    }
  }

  if (keep.length === 0) return '';
  return stringifyNodes(keep);
}

/**
 * Compares two specificity vectors, returning the winning one.
 *
 * @param {Array} vector a
 * @param {Array} vector b
 * @return {Array}
 * @api public
 */

export function compareFunc(a, b) {
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) {
    if (a[i] === b[i]) { continue; }
    if (a[i] > b[i]) { return 1; }
    return -1;
  }

  return a.length - b.length;
}

export function compare(a, b) {
  return compareFunc(a, b) == 1 ? a : b;
}

export function getDefaultOptions(options) {
  const result = Object.assign({
    extraCss: '',
    insertPreservedExtraCss: true,
    applyStyleTags: true,
    removeStyleTags: true,
    removeInlinedSelectors: false,
    preserveMediaQueries: true,
    preserveContainerQueries: true,
    preserveLayers: true,
    preserveFontFaces: true,
    preserveKeyFrames: true,
    preservePseudos: true,
    preservedSelectors: [],
    applyWidthAttributes: true,
    applyHeightAttributes: true,
    applyAttributesTableElements: true,
    resolveCSSVariables: true,
    inlineDuplicateProperties: false,
    url: ''
  }, options);

  result.webResources = result.webResources || {};

  return result;
}
