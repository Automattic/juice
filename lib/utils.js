'use strict';

/**
 * Module dependencies.
 */

import mensch from 'mensch';
import Selector from './selector.js';
import Property from './property.js';

export { Selector, Property };

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from mensch
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

/**
 * Returns a parse tree for a CSS source.
 * If it encounters multiple selectors separated by a comma, it splits the
 * tree.
 *
 * @param {String} css source
 * @api public
 */

export function parseCSS(css) {
  const parsed = mensch.parse(css, { position: true, comments: true });
  const rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  const ret = [];
  let ignoring = false;
  let ignoreEntireFile = false;

  // Check if the first rule is a comment that ignores the entire file
  if (rules.length > 0 && rules[0].type === 'comment' && rules[0].text) {
    const firstComment = rules[0].text.trim();
    if (firstComment === 'juice ignore') {
      ignoreEntireFile = true;
    }
  }

  if (ignoreEntireFile) {
    return ret;
  }

  for (let i = 0, l = rules.length; i < l; i++) {
    // Handle comments for ignore directives
    if (rules[i].type === 'comment') {
      if (!rules[i].text) {
        continue;
      }
      const comment = rules[i].text.trim();

      if (comment === 'juice start ignore') {
        ignoring = true;
      } else if (comment === 'juice end ignore') {
        ignoring = false;
      } else if (comment === 'juice ignore next') {
        // Skip the next rule
        i++;
      }
      continue;
    }

    // Skip rules if we're in an ignore block
    if (ignoring) {
      continue;
    }

    if (rules[i].type == 'rule') {
      const rule = rules[i];
      const selectors = rule.selectors;

      // Check if this rule has 'juice ignore next' in its declarations
      // If so, we need to skip specific declarations that follow the comment
      const filteredDeclarations = [];
      if (rule.declarations) {
        let skipNext = false;
        for (let d = 0; d < rule.declarations.length; d++) {
          const decl = rule.declarations[d];

          if (decl.type === 'comment' && decl.text) {
            const declComment = decl.text.trim();
            if (declComment === 'juice ignore next') {
              skipNext = true;
              continue;
            }
          }

          if (skipNext && decl.type === 'property') {
            skipNext = false;
            continue;
          }

          if (decl.type === 'property') {
            filteredDeclarations.push(decl);
          }
        }
      }

      // Only add rule if it has declarations after filtering
      if (filteredDeclarations.length > 0) {
        for (let ii = 0, ll = selectors.length; ii < ll; ii++) {
          ret.push([selectors[ii], filteredDeclarations]);
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
 * @api public
 */

export function getPreservedText(css, options, ignoredPseudos) {
  const parsed = mensch.parse(css, { position: true, comments: true });
  const rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  const preserved = [];
  let ignoring = false;
  let ignoreBlock = [];
  let ignoreEntireFile = false;
  const ignoredRuleIndices = new Set();

  // Check if the first rule is a comment that ignores the entire file
  if (rules.length > 0 && rules[0].type === 'comment' && rules[0].text) {
    const firstComment = rules[0].text.trim();
    if (firstComment === 'juice ignore') {
      ignoreEntireFile = true;
    }
  }

  // If ignoring entire file, preserve everything
  if (ignoreEntireFile) {
    return '\n' + css + '\n';
  }

  // First pass: identify rules to ignore/preserve (forward iteration for "ignore next")
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].type === 'comment' && rules[i].text) {
      const comment = rules[i].text.trim();
      if (comment === 'juice ignore next' && i + 1 < rules.length) {
        ignoredRuleIndices.add(i + 1);
      }
    }

    // Also check for declarations with "juice ignore next"
    if (rules[i].type === 'rule' && rules[i].declarations) {
      for (let d = 0; d < rules[i].declarations.length; d++) {
        if (rules[i].declarations[d].type === 'comment' && rules[i].declarations[d].text) {
          const declComment = rules[i].declarations[d].text.trim();
          if (declComment === 'juice ignore next') {
            ignoredRuleIndices.add(i);
            break;
          }
        }
      }
    }
  }

  // Second pass: process rules (backward iteration for proper order)
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];

    // Handle juice ignore comments
    if (rule.type === 'comment') {
      if (!rule.text) {
        continue;
      }
      const comment = rule.text.trim();

      if (comment === 'juice end ignore') {
        ignoring = true;
        ignoreBlock.push(rule);
      } else if (comment === 'juice start ignore') {
        ignoring = false;
        ignoreBlock.push(rule);
        // Stringify the entire ignore block
        if (ignoreBlock.length > 0) {
          preserved.unshift(
            mensch.stringify(
              { stylesheet: { rules: ignoreBlock.reverse() } },
              { comments: true, indentation: '  ' }
            )
          );
          ignoreBlock = [];
        }
      }
      // Skip "juice ignore next" comments themselves
      continue;
    }

    // If we're in an ignore block, collect the rules
    if (ignoring) {
      ignoreBlock.push(rule);
      continue;
    }

    // Check if this rule was marked to be ignored
    if (ignoredRuleIndices.has(i)) {
      preserved.unshift(
        mensch.stringify(
          { stylesheet: { rules: [rule] } },
          { comments: true, indentation: '  ' }
        )
      );
      continue;
    }

    // Original preserve logic
    if ((options.fontFaces && rule.type === 'font-face') ||
      (options.mediaQueries && rule.type === 'media') ||
      (options.keyFrames && rule.type === 'keyframes') ||
      (options.pseudos && rule.selectors && matchesPseudo(rule.selectors[0], ignoredPseudos)) ||
      (options.preservedSelectors && rule.selectors && rule.selectors.some(function(sel) {
        return matchesPreservedSelector(sel, options.preservedSelectors);
      }))) {
      preserved.unshift(
        mensch.stringify(
          { stylesheet: { rules: [rule] } },
          { comments: false, indentation: '  ' }
        )
      );
    }
  }

  if (preserved.length === 0) {
    return false;
  }
  return '\n' + preserved.join('\n') + '\n';
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
    // Exact match
    if (selector === pattern) {
      return true;
    }
    // Check if pattern is a substring (for simple contains matching)
    if (selector.indexOf(pattern) !== -1) {
      return true;
    }
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
  const parsed = mensch.parse(css, { position: true, comments: true });
  const rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules
    ? parsed.stylesheet.rules
    : [];
  const remainingRules = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // Always preserve non-rule types (media queries, font-faces, keyframes, comments)
    if (rule.type !== 'rule') {
      remainingRules.push(rule);
      continue;
    }

    // Keep rules with pseudos that were ignored during inlining
    if (rule.selectors && options.preservePseudos && matchesPseudo(rule.selectors[0], ignoredPseudos)) {
      remainingRules.push(rule);
      continue;
    }

    // Keep rules that match preservedSelectors
    if (rule.selectors && options.preservedSelectors && rule.selectors.some(function(sel) {
      return matchesPreservedSelector(sel, options.preservedSelectors);
    })) {
      remainingRules.push(rule);
      continue;
    }

    // Filter out selectors that were inlined
    const remainingSelectors = rule.selectors.filter(function(selector) {
      return !inlinedSelectors.has(selector);
    });

    // If some selectors remain, create a new rule with only those selectors
    if (remainingSelectors.length > 0) {
      const newRule = Object.assign({}, rule, { selectors: remainingSelectors });
      remainingRules.push(newRule);
    }
  }

  if (remainingRules.length === 0) {
    return '';
  }

  return mensch.stringify(
    { stylesheet: { rules: remainingRules } },
    { comments: false, indentation: '  ' }
  );
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
