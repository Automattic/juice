import { decode } from 'entities';

import * as utils from './utils.js';
import * as numbers from './numbers.js';
import * as variables from './variables.js';

export default function makeJuiceClient(juiceClient) {
  juiceClient.ignoredPseudos = ['hover', 'active', 'focus', 'visited', 'link'];
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
    const counters = {};
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

        if (!el.counterProps) {
          el.counterProps = el.parent && el.parent.counterProps
            ? Object.create(el.parent.counterProps)
            : {};
        }

        if (pseudoElementType) {
          const pseudoElPropName = 'pseudo' + pseudoElementType;
          let pseudoEl = el[pseudoElPropName];
          if (!pseudoEl) {
            pseudoEl = el[pseudoElPropName] = $('<span />').get(0);
            pseudoEl.pseudoElementType = pseudoElementType;
            pseudoEl.pseudoElementParent = el;
            pseudoEl.counterProps = el.counterProps;
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
            addProps(utils.parseCSS(cssText, { strict: true })[0][1], new utils.Selector('<style>', true));
          }

          // store reference to an element we need to compile style="" attr for
          editedElements.push(el);
        }

        function resetCounter(el, value) {
          const tokens = value.split(/\s+/);

          for (let j = 0; j < tokens.length; j++) {
            const counter = tokens[j];
            const resetval = parseInt(tokens[j + 1], 10);

            isNaN(resetval)
              ? el.counterProps[counter] = counters[counter] = 0
              : el.counterProps[counter] = counters[tokens[j++]] = resetval;
          }
        }

        function incrementCounter(el, value) {
          const tokens = value.split(/\s+/);

          for (let j = 0; j < tokens.length; j++) {
            const counter = tokens[j];

            if (el.counterProps[counter] === undefined) {
              continue;
            }

            const incrval = parseInt(tokens[j + 1], 10);

            isNaN(incrval)
              ? el.counterProps[counter] = counters[counter] += 1
              : el.counterProps[counter] = counters[tokens[j++]] += incrval;
          }
        }

        // go through the properties
        function addProps(style, selector) {
          for (let i = 0, l = style.length; i < l; i++) {
            if (style[i].type == 'property') {
              const name = style[i].name;
              let value = style[i].value;

              if (name === 'counter-reset') {
                resetCounter(el, value);
              }

              if (name === 'counter-increment') {
                incrementCounter(el, value);
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

      const string = props
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
      if (string) {
        $(el).attr(styleAttributeName, string);
      }
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
      if (counterMatch && counterMatch[1] in el.counterProps) {
        const counter = el.counterProps[counterMatch[1]];
        parsed.push(applyCounterStyle(counter, counterMatch[3]));
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
    if (options.removeInlinedSelectors && !options.removeStyleTags) {
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

    return $;
  }

  function updateStyleTags($, inlinedSelectors, options, embedStyleElements) {
    const stylesList = $('style');
    stylesList.each(function() {
      const styleElement = this;
      const styleDataList = styleElement.childNodes;

      if (styleDataList.length !== 1) {
        return;
      }

      // Skip data-embed style elements (attribute may have been removed by getStylesData)
      if (embedStyleElements && embedStyleElements.has(styleElement)) {
        return;
      }

      const originalCss = styleDataList[0].nodeValue;
      const remainingCss = utils.removeInlinedSelectorsFromCSS(
        originalCss,
        inlinedSelectors,
        options,
        juiceClient.ignoredPseudos
      );

      if (remainingCss && remainingCss.trim()) {
        styleElement.childNodes[0].nodeValue = remainingCss;
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
      const styleDataList = styleElement.childNodes;
      if (styleDataList.length !== 1) {
        if (options.removeStyleTags) {
          $(styleElement).remove();
        }
        return;
      }
      const styleData = styleDataList[0].data;
      if (options.applyStyleTags && $(styleElement).attr('data-embed') === undefined) {
        results.push(styleData);
      }
      if (options.removeStyleTags && $(styleElement).attr('data-embed') === undefined) {
        const text = styleElement.childNodes[0].nodeValue;
        const preservedText = utils.getPreservedText(text, {
          mediaQueries: options.preserveMediaQueries,
          containerQueries: options.preserveContainerQueries,
          layers: options.preserveLayers,
          fontFaces: options.preserveFontFaces,
          keyFrames: options.preserveKeyFrames,
          pseudos: options.preservePseudos,
          preservedSelectors: options.preservedSelectors
        }, juiceClient.ignoredPseudos);
        if (preservedText) {
          styleElement.childNodes[0].nodeValue = preservedText;
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
