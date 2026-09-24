import { decode } from 'entities';

import * as utils from './utils.js';
import * as numbers from './numbers.js';
import * as variables from './variables.js';

export default function makeJuiceClient(juiceClient) {
  juiceClient.ignoredPseudos = [
    'hover', 'active', 'focus', 'visited', 'link',
    'first-letter', 'first-line', 'marker', 'selection', 'placeholder'
  ];
  juiceClient.widthElements = ['TABLE', 'TD', 'TH', 'IMG'];
  juiceClient.heightElements = ['TABLE', 'TD', 'TH', 'IMG'];
  juiceClient.tableElements = ['TABLE', 'TH', 'TR', 'TD', 'CAPTION', 'COLGROUP', 'COL', 'THEAD', 'TBODY', 'TFOOT'];
  juiceClient.nonVisualElements = ['HEAD', 'TITLE', 'BASE', 'LINK', 'STYLE', 'META', 'SCRIPT', 'NOSCRIPT'];
  juiceClient.styleToAttribute = {
    'background-color': 'bgcolor',
    'background-image': 'background',
    'text-align': 'align',
    'vertical-align': 'valign'
  };
  juiceClient.excludedProperties = [];

  juiceClient.juiceDocument = juiceDocument;
  juiceClient.inlineDocument = inlineDocument;

  function inlineDocument($, css, options) {
    options = utils.getDefaultOptions(options);
    const rules = utils.parseCSS(css);
    const editedElements = [];
    let styleAttributeName = 'style';
    let usesCounters = false;
    const inlinedSelectors = options.removeInlinedSelectors ? new Set() : null;

    if (options.styleAttributeName) {
      styleAttributeName = options.styleAttributeName;
    }

    function handleRule(rule) {
      let sel = rule[0];
      const style = rule[1];
      const selector = new utils.Selector(sel);
      const parsedRoot = selector.parsed();

      if (!parsedRoot || parsedRoot.nodes.length === 0) {
        return;
      }

      const firstSelector = parsedRoot.nodes[0];
      const pseudoElementType = getPseudoElementType(firstSelector);

      // skip rule if the selector has any pseudos which are ignored
      let hasIgnoredPseudo = false;
      firstSelector.walkPseudos((pseudo) => {
        const name = pseudo.value.replace(/^:+/, '');
        if (juiceClient.ignoredPseudos.indexOf(name) >= 0) {
          hasIgnoredPseudo = true;
        }
      });
      if (hasIgnoredPseudo) return;

      if (pseudoElementType) {
        const stripped = firstSelector.clone();
        stripped.walkPseudos((p) => {
          if (isPseudoElementNode(p)) p.remove();
        });
        sel = stripped.toString();
      }

      let els;
      try {
        els = $(sel);
      } catch (err) {
        // skip invalid selector
        return;
      }

      // Track if this selector matched any elements
      let matchedElements = false;

      els.each(function () {
        let el = this;

        if (el.name && juiceClient.nonVisualElements.indexOf(el.name.toUpperCase()) >= 0) {
          return;
        }

        matchedElements = true;

        // per-element override of options.inlineDuplicateProperties via the
        // data-juice-duplicates attribute. Presence (or "true") enables
        // duplicates for this element; "false" disables them.
        let allowDuplicates = options.inlineDuplicateProperties;
        const duplicatesAttr = $(el).attr('data-juice-duplicates');
        if (duplicatesAttr !== undefined) {
          allowDuplicates = duplicatesAttr !== 'false';
        }

        // per-element override of options.preserveImportant via the
        // data-juice-important attribute. Presence (or "true") preserves
        // !important for this element; "false" strips it.
        let preserveImportant = options.preserveImportant;
        const importantAttr = $(el).attr('data-juice-important');
        if (importantAttr !== undefined) {
          preserveImportant = importantAttr !== 'false';
        }

        if (pseudoElementType) {
          const pseudoElPropName = 'pseudo' + pseudoElementType;
          let pseudoEl = el[pseudoElPropName];
          if (!pseudoEl) {
            pseudoEl = el[pseudoElPropName] = $('<span />').get(0);
            pseudoEl.pseudoElementType = pseudoElementType;
            pseudoEl.pseudoElementParent = el;
            el[pseudoElPropName] = pseudoEl;
          }
          el = pseudoEl;
        }

        if (!el.styleProps) {
          el.styleProps = {};
          el.preserveImportant = preserveImportant;

          // if the element has inline styles, fake selector with topmost specificity
          if ($(el).attr(styleAttributeName)) {
            const styleAttributeValue = $(el).attr(styleAttributeName);
            const cssStyleAttributeValue = options.decodeStyleAttributes
              ? decode(styleAttributeValue)
              : styleAttributeValue;
            const cssText = '* { ' + cssStyleAttributeValue + ' } ';
            let declarations;
            try {
              declarations = utils.parseCSS(cssText, { strict: true })[0][1];
            } catch (err) {
              // Template tags between declarations (`{{#if x}} color: red; {{/if}}`)
              // aren't valid CSS, so keep the attribute as-is. The inlined styles
              // go in front of it, so its declarations still win.
              if (!/JUICE_CODE_BLOCK_\d+_/.test(styleAttributeValue)) {
                throw err;
              }
              el.rawStyleAttribute = styleAttributeValue.trim();
            }
            if (declarations) {
              addProps(declarations, new utils.Selector('<style>', true));
            }
          }

          // store reference to an element we need to compile style="" attr for
          editedElements.push(el);
        }

        // go through the properties
        function addProps(style, selector) {
          for (let i = 0, l = style.length; i < l; i++) {
            if (style[i].type == 'property') {
              const name = style[i].name;
              let value = style[i].value;

              if (/^counter-(reset|set|increment)$/.test(name) || (name === 'content' && /counter\s*\(/i.test(value))) {
                usesCounters = true;
              }

              const important = value.match(/!important$/) !== null;
              if (important && !preserveImportant) value = removeImportant(value);
              // adds line number and column number for the properties as "additionalPriority" to the
              // properties because in CSS the position directly affect the priority.
              const additionalPriority = [style[i].position.start.line, style[i].position.start.col];
              const prop = new utils.Property(name, value, selector, important ? 2 : 0, additionalPriority);
              const existing = el.styleProps[name];

              // if property name is not in the excluded properties array
              if (juiceClient.excludedProperties.indexOf(name) < 0) {
                if (allowDuplicates) {
                  // When allowing duplicates, we need to track all properties
                  if (existing) {
                    // Check if this is from the same selector as the existing property
                    if (existing.selector === selector) {
                      // Same selector: prepend to maintain declaration order (since we're building the chain in reverse)
                      prop.nextProp = existing;
                      el.styleProps[name] = prop;
                    } else {
                      // Different selector: append to end of chain to maintain specificity order
                      let last = existing;
                      while (last.nextProp) {
                        last = last.nextProp;
                      }
                      last.nextProp = prop;
                    }
                  } else {
                    el.styleProps[name] = prop;
                  }
                } else if (existing && existing.compare(prop) === prop || !existing) {
                  // deleting a property let us change the order (move it to the end in the setStyleAttrs loop)
                  if (existing && existing.selector !== selector) {
                    delete el.styleProps[name];
                  } else if (existing) {
                    // make "prop" a special composed property.
                    prop.nextProp = existing;
                  }

                  el.styleProps[name] = prop;
                }
              }
            }
          }
        }

        addProps(style, selector);
      });

      // If the selector matched elements and we're tracking inlined selectors, add it to the set
      if (matchedElements && inlinedSelectors) {
        inlinedSelectors.add(rule[0]);
      }
    }

    function setStyleAttrs(el) {
      const props = [];
      // Here we loop each property and make sure to "expand"
      // linked "nextProp" properties happening when the same property
      // is declared multiple times in the same selector.
      Object.keys(el.styleProps).forEach(function (key) {
        let np = el.styleProps[key];
        while (typeof np !== 'undefined') {
          props.push(np);
          np = np.nextProp;
        }
      });
      // sort properties by their originating selector's specificity so that
      // props like "padding" and "padding-bottom" are resolved as expected.
      props.sort(function (a, b) {
        return a.compareFunc(b);
      });

      let string = props
        .filter(function (prop) {
          // don't add css variables if we're resolving their values
          if (options.resolveCSSVariables && (prop.prop.indexOf('--') === 0)) {
            return false;
          }

          // Content becomes the innerHTML of pseudo elements, not used as a
          // style property
          return (prop.prop !== 'content');
        })
        .map(function (prop) {
          if (options.resolveCSSVariables) {
            prop.value = variables.replaceVariables(el, prop.value);
          }
          return prop.prop + ': ' + prop.value.replace(/["]/g, '\'') + ';';
        })
        .join(' ');
      if (string && el.rawStyleAttribute) {
        string += ' ' + el.rawStyleAttribute;
      }
      if (string) {
        $(el).attr(styleAttributeName, string);
      }
    }

    // Counters depend on document order and scope: a counter-reset applies to the
    // element, its descendants and its following siblings. So they're resolved in
    // one pass over the document after all rules are applied, following CSS Lists 3.
    // ::before and ::after count as the element's first and last child.
    function resolveCounters($) {
      let previous = [];

      const parentOf = (node) => node.pseudoElementParent || node.parent;

      const winningValue = (node, name) => {
        let prop = node.styleProps && node.styleProps[name];
        let winner = prop;
        while (prop) {
          winner = prop.compare(winner);
          prop = prop.nextProp;
        }
        return winner ? removeImportant(winner.value) : null;
      };

      // "a 2 b" -> [['a', 2], ['b', defaultAmount]]
      const counterList = (value, defaultAmount) => {
        const tokens = value.trim().split(/\s+/);
        const list = [];
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === 'none') continue;
          const amount = parseInt(tokens[i + 1], 10);
          list.push([tokens[i], isNaN(amount) ? defaultAmount : amount]);
          if (!isNaN(amount)) i++;
        }
        return list;
      };

      const innermost = (counters, name) => {
        for (let i = counters.length - 1; i >= 0; i--) {
          if (counters[i].name === name) return counters[i];
        }
        return null;
      };

      const instantiate = (node, counters, name, value) => {
        const last = innermost(counters, name);
        if (last && (last.origin === node || parentOf(last.origin) === parentOf(node))) {
          counters.splice(counters.lastIndexOf(last), 1);
        }
        const counter = { name, origin: node, value };
        counters.push(counter);
        return counter;
      };

      const visit = (node, parentCounters, siblingCounters) => {
        const counters = parentCounters.map((c) => Object.assign({}, c));
        siblingCounters.forEach((c) => {
          if (!counters.some((d) => d.name === c.name)) {
            counters.push(Object.assign({}, c));
          }
        });
        previous.forEach((c) => {
          const own = counters.find((d) => d.name === c.name && d.origin === c.origin);
          if (own) own.value = c.value;
        });

        const reset = winningValue(node, 'counter-reset');
        if (reset) {
          counterList(reset, 0).forEach(([name, value]) => instantiate(node, counters, name, value));
        }
        const increment = winningValue(node, 'counter-increment');
        if (increment) {
          counterList(increment, 1).forEach(([name, amount]) => {
            (innermost(counters, name) || instantiate(node, counters, name, 0)).value += amount;
          });
        }
        const set = winningValue(node, 'counter-set');
        if (set) {
          counterList(set, 0).forEach(([name, value]) => {
            (innermost(counters, name) || instantiate(node, counters, name, 0)).value = value;
          });
        }

        node.counters = counters;
        previous = counters;

        const children = [node.pseudobefore]
          .concat((node.children || []).filter((child) => child.type === 'tag' || child.type === 'script' || child.type === 'style'))
          .concat(node.pseudoafter)
          .filter(Boolean);
        let siblings = [];
        children.forEach((child) => {
          siblings = visit(child, counters, siblings);
        });
        return counters;
      };

      let siblings = [];
      $.root().get(0).children
        .filter((child) => child.type === 'tag')
        .forEach((child) => {
          siblings = visit(child, [], siblings);
        });
    }

    function inlinePseudoElements(el) {
      if (el.pseudoElementType && el.styleProps.content) {
        const parsed = parseContent(el);
        if (parsed.img) {
          el.name = 'img';
          $(el).attr('src', parsed.img);
        } else {
          $(el).text(parsed);
        }
        const parent = el.pseudoElementParent;
        if (el.pseudoElementType === 'before') {
          $(parent).prepend(el);
        } else {
          $(parent).append(el);
        }
      }
    }

    function setDimensionAttrs(el, dimension) {
      if (!el.name) { return; }
      const elName = el.name.toUpperCase();
      if (juiceClient[dimension + 'Elements'].indexOf(elName) > -1) {
        for (const i in el.styleProps) {
          if (el.styleProps[i].prop === dimension) {
            let value = el.styleProps[i].value;
            if (el.preserveImportant) {
              value = removeImportant(value);
            }
            if (value.match(/(px|auto)/)) {
              const size = value.replace('px', '');
              $(el).attr(dimension, size);
              return;
            }
            if (juiceClient.tableElements.indexOf(elName) > -1 && value.match(/\%/)) {
              $(el).attr(dimension, value);
              return;
            }
          }
        }
      }
    }

    function extractBackgroundUrl(value) {
      return value.indexOf('url(') !== 0
        ? value
        : value.replace(/^url\((["'])?([^"']+)\1\)$/, '$2');
    }

    function setAttributesOnTableElements(el) {
      if (!el.name) { return; }
      const elName = el.name.toUpperCase();
      const styleProps = Object.keys(juiceClient.styleToAttribute);

      if (juiceClient.tableElements.indexOf(elName) > -1) {
        for (const i in el.styleProps) {
          if (styleProps.indexOf(el.styleProps[i].prop) > -1) {
            const prop = juiceClient.styleToAttribute[el.styleProps[i].prop];
            let value = el.styleProps[i].value;
            if (el.preserveImportant) {
              value = removeImportant(value);
            }
            if (prop === 'background') {
              value = extractBackgroundUrl(value);
            }
            if (/(linear|radial)-gradient\(/i.test(value)) {
              continue;
            }
            $(el).attr(prop, value);
          }
        }
      }
    }

    rules.forEach(handleRule);

    // data-juice-duplicates is a juice control attribute; strip it from output.
    $('[data-juice-duplicates]').removeAttr('data-juice-duplicates');

    // data-juice-important is a juice control attribute; strip it from output.
    $('[data-juice-important]').removeAttr('data-juice-important');

    editedElements.forEach(setStyleAttrs);

    if (options.inlinePseudoElements) {
      if (usesCounters) {
        resolveCounters($);
      }
      editedElements.forEach(inlinePseudoElements);
    }

    if (options.applyWidthAttributes) {
      editedElements.forEach(function(el) {
        setDimensionAttrs(el, 'width');
      });
    }

    if (options.applyHeightAttributes) {
      editedElements.forEach(function(el) {
        setDimensionAttrs(el, 'height');
      });
    }

    if (options.applyAttributesTableElements) {
      editedElements.forEach(setAttributesOnTableElements);
    }

    if (options.insertPreservedExtraCss && options.extraCss) {
      const preservedText = utils.getPreservedText(options.extraCss, {
        mediaQueries: options.preserveMediaQueries,
        containerQueries: options.preserveContainerQueries,
        layers: options.preserveLayers,
        fontFaces: options.preserveFontFaces,
        keyFrames: options.preserveKeyFrames,
        preservedSelectors: options.preservedSelectors
      });
      if (preservedText) {
        let $appendTo = null;
        if (options.insertPreservedExtraCss !== true) {
          $appendTo = $(options.insertPreservedExtraCss);
        } else {
          $appendTo = $('head');
          if (!$appendTo.length) { $appendTo = $('body'); }
          if (!$appendTo.length) { $appendTo = $.root(); }
        }

        $appendTo.first().append('<style>' + preservedText + '</style>');
      }
    }

    return inlinedSelectors;
  }

  function removeImportant(value) {
    return value.replace(/\s*!important$/, '');
  }

  function applyCounterStyle(counter, style) {
    switch (style) {
      case 'lower-roman':
        return numbers.romanize(counter).toLowerCase();
      case 'upper-roman':
        return numbers.romanize(counter);
      case 'lower-latin':
      case 'lower-alpha':
        return numbers.alphanumeric(counter).toLowerCase();
      case 'upper-latin':
      case 'upper-alpha':
        return numbers.alphanumeric(counter);
      // TODO support more counter styles
      default:
        return counter.toString();
    }
  }

  function parseContent(el) {
    let content = el.styleProps.content.value;

    if (content === 'none' || content === 'normal') {
      return '';
    }

    const imageUrlMatch = content.match(/^\s*url\s*\(\s*(.*?)\s*\)\s*$/i);
    if (imageUrlMatch) {
      const url = imageUrlMatch[1].replace(/^['"]|['"]$/g, '');
      return { img: url };
    }

    const parsed = [];

    const tokens = content.split(/['"]/);
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '') continue;

      const varMatch = tokens[i].match(/var\s*\(\s*(.*?)\s*(,\s*(.*?)\s*)?\s*\)/i);
      if (varMatch) {
        const variable = variables.findVariableValue(el, varMatch[1]) || varMatch[2];
        parsed.push(variable.replace(/^['"]|['"]$/g, ''));
        continue;
      }

      const counterMatch = tokens[i].match(/counter\s*\(\s*(.*?)\s*(,\s*(.*?)\s*)?\s*\)/i);
      if (counterMatch) {
        const counter = (el.counters || []).filter((c) => c.name === counterMatch[1]).pop();
        parsed.push(applyCounterStyle(counter ? counter.value : 0, counterMatch[3]));
        continue;
      }

      const attrMatch = tokens[i].match(/attr\s*\(\s*(.*?)\s*\)/i);
      if (attrMatch) {
        const attr = attrMatch[1];
        parsed.push(el.pseudoElementParent
          ? el.pseudoElementParent.attribs[attr]
          : el.attribs[attr]
        );
        continue;
      }

      parsed.push(tokens[i]);
    }

    content = parsed.join('');
    // Naive unescape, assume no unicode char codes
    content = content.replace(/\\/g, '');
    return content;
  }

  // Return "before" or "after" if the given selector has a pseudo-element
  // (e.g., a::after, a:before). Walks all pseudos rather than just the last
  // compound — by CSS spec pseudo-elements only appear terminally, so this
  // matches the prior "look at last compound's pseudos" behaviour for any
  // well-formed selector.
  function getPseudoElementType(selectorNode) {
    let found;
    selectorNode.walkPseudos((p) => {
      if (!found && isPseudoElementNode(p)) {
        found = p.value.replace(/^:+/, '');
      }
    });
    return found;
  }

  function isPseudoElementNode(pseudo) {
    const name = pseudo.value;
    return name === ':before' || name === '::before' || name === ':after' || name === '::after';
  }

  function juiceDocument($, options) {
    options = utils.getDefaultOptions(options);

    // Track data-embed style elements before getStylesData removes the attribute
    const embedStyleElements = new Set();
    if ((options.removeInlinedSelectors && !options.removeStyleTags) || options.addImportantToPseudoClasses) {
      $('style[data-embed]').each(function() {
        embedStyleElements.add(this);
      });
    }

    let css = extractCssFromDocument($, options);
    css += '\n' + options.extraCss;

    const inlinedSelectors = inlineDocument($, css, options);

    // If removeInlinedSelectors is enabled, update style tags to remove inlined rules
    if (inlinedSelectors && !options.removeStyleTags) {
      updateStyleTags($, inlinedSelectors, options, embedStyleElements);
    }

    if (options.addImportantToPseudoClasses) {
      addImportantToStyleTags($, embedStyleElements);
    }

    return $;
  }

  // Pseudo-elements aren't overridden by the element's inline styles, so they
  // don't need !important (and ignoredPseudos includes some of them).
  const pseudoElements = ['before', 'after', 'first-letter', 'first-line', 'marker', 'selection', 'placeholder'];

  function addImportantToStyleTags($, embedStyleElements) {
    const pseudoClasses = juiceClient.ignoredPseudos.filter((name) => pseudoElements.indexOf(name) === -1);
    if (pseudoClasses.length === 0) {
      return;
    }
    $('style').each(function() {
      const content = embedStyleElements.has(this) ? null : getStyleContent(this);
      if (content) {
        content.set(utils.addImportantToPseudoClasses(content.css, pseudoClasses));
      }
    });
  }

  // The CSS of a <style> is usually a single text node. In XML mode it can
  // also be a CDATA section, optionally wrapped in CSS comments so that HTML
  // parsers skip the markers: /*<![CDATA[*/ ... /*]]>*/
  function getStyleContent(styleElement) {
    const nodes = styleElement.childNodes;
    if (nodes.length === 1 && nodes[0].type === 'text') {
      const textNode = nodes[0];
      return { css: textNode.data, set: (css) => { textNode.data = css; } };
    }

    const cdata = nodes.filter((node) => node.type === 'cdata');
    const onlyMarkersAround = nodes.every((node) => node.type === 'cdata'
      || (node.type === 'text' && /^\s*(\/\*|\*\/)?\s*$/.test(node.data)));
    if (cdata.length !== 1 || !onlyMarkersAround || cdata[0].childNodes.length !== 1) {
      return null;
    }

    const textNode = cdata[0].childNodes[0];
    const commented = /^\s*\*\//.test(textNode.data) && /\/\*\s*$/.test(textNode.data);
    return {
      css: commented ? textNode.data.replace(/^\s*\*\//, '').replace(/\/\*\s*$/, '') : textNode.data,
      set: (css) => { textNode.data = commented ? '*/' + css + '/*' : css; },
    };
  }

  function updateStyleTags($, inlinedSelectors, options, embedStyleElements) {
    const stylesList = $('style');
    stylesList.each(function() {
      const styleElement = this;
      const content = getStyleContent(styleElement);

      if (!content) {
        return;
      }

      // Skip data-embed style elements (attribute may have been removed by getStylesData)
      if (embedStyleElements && embedStyleElements.has(styleElement)) {
        return;
      }

      const remainingCss = utils.removeInlinedSelectorsFromCSS(
        content.css,
        inlinedSelectors,
        options,
        juiceClient.ignoredPseudos
      );

      if (remainingCss && remainingCss.trim()) {
        content.set(remainingCss);
      } else {
        $(styleElement).remove();
      }
    });
  }

  function getStylesData($, options) {
    const results = [];
    const stylesList = $('style');
    stylesList.each(function() {
      const styleElement = this;
      const content = getStyleContent(styleElement);
      if (!content) {
        if (options.removeStyleTags) {
          $(styleElement).remove();
        }
        return;
      }
      if (options.applyStyleTags && $(styleElement).attr('data-embed') === undefined) {
        results.push(content.css);
      }
      if (options.removeStyleTags && $(styleElement).attr('data-embed') === undefined) {
        const preservedText = utils.getPreservedText(content.css, {
          mediaQueries: options.preserveMediaQueries,
          containerQueries: options.preserveContainerQueries,
          layers: options.preserveLayers,
          fontFaces: options.preserveFontFaces,
          keyFrames: options.preserveKeyFrames,
          pseudos: options.preservePseudos,
          preservedSelectors: options.preservedSelectors
        }, juiceClient.ignoredPseudos);
        if (preservedText) {
          content.set(preservedText);
        } else {
          $(styleElement).remove();
        }
      }
      $(styleElement).removeAttr('data-embed');
    });
    return results;
  }

  function extractCssFromDocument($, options) {
    const results = getStylesData($, options);
    const css = results.join('\n');
    return css;
  }

  return juiceClient;
}
