/**
 * Module dependencies.
 */
import { load } from 'cheerio/slim';
import { htmlTypeError } from './utils.js';

// In XML mode <style> isn't raw text, so a `<` in CSS (a comment, or a range
// media query like `(width<600px)`) would be parsed as a tag. That CSS is set
// aside before parsing and put back into the parsed <style> elements after.
const styleContentRe = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
const styleTokenRe = /^JUICE_STYLE_(\d+)_$/;

const setAsideStyles = function(html, styles) {
  return html.replace(styleContentRe, function(match, open, css, close) {
    if (css.indexOf('<') === -1 || css.indexOf('<![CDATA[') > -1) {
      return match;
    }
    styles.push(css);
    return open + 'JUICE_STYLE_' + (styles.length - 1) + '_' + close;
  });
};

const restoreStyles = function($, styles) {
  $('style').each(function() {
    const node = this.children[0];
    const token = this.children.length === 1 && node.type === 'text' && styleTokenRe.exec(node.data);
    if (token) {
      node.data = styles[token[1]];
    }
  });
};

const cheerioLoad = function(html, options, encodeEntities) {
  const { xmlMode, ...rest } = options;
  options = Object.assign({ xml: { decodeEntities: false, xmlMode } }, rest);
  html = encodeEntities(html);
  if (!xmlMode) {
    return load(html, options);
  }

  const styles = [];
  const $ = load(setAsideStyles(html, styles), options);
  restoreStyles($, styles);
  return $;
};

const createEntityConverters = function () {
  const codeBlockLookup = [];

  const encodeCodeBlocks = function(html) {
    const blocks = juiceCheerio.codeBlocks;
    Object.keys(blocks).forEach(function(key) {
      const re = new RegExp(blocks[key].start + '([\\S\\s]*?)' + blocks[key].end, 'g');
      html = html.replace(re, function(match) {
        codeBlockLookup.push(match);
        return 'JUICE_CODE_BLOCK_' + (codeBlockLookup.length - 1) + '_';
      });
    });
    return html;
  };

  const decodeCodeBlocks = function(html) {
    for (let index = 0; index < codeBlockLookup.length; index++) {
      const re = new RegExp('JUICE_CODE_BLOCK_' + index + '_(="")?', 'gi');
      html = html.replace(re, function() {
        return codeBlockLookup[index];
      });
    }
    return html;
  };

  return {
    encodeEntities: encodeCodeBlocks,
    decodeEntities: decodeCodeBlocks,
  };
};

/**
 * Parses the input, calls the callback on the parsed DOM, and generates the output
 *
 * @param {String} html input html to be processed
 * @param {Object} options for the parser
 * @param {Function} callback to be invoked on the DOM
 * @param {Array} callbackExtraArguments to be passed to the callback
 * @return {String} resulting html
 */
function juiceCheerio(html, options, callback, callbackExtraArguments) {
  const typeError = htmlTypeError(html);
  if (typeError) {
    throw typeError;
  }

  const entityConverters = createEntityConverters();

  const $ = cheerioLoad(html, options, entityConverters.encodeEntities);
  const args = [$];
  args.push.apply(args, callbackExtraArguments);
  const doc = callback.apply(undefined, args) || $;

  if (options && options.xmlMode) {
    return entityConverters.decodeEntities(doc.xml());
  }
  return entityConverters.decodeEntities(doc.html());
}

juiceCheerio.codeBlocks = {
  EJS: { start: '<%', end: '%>' },
  HBS: { start: '{{', end: '}}' },
  FTL: { start: '<#', end: '>' },
  FTL_CLOSE: { start: '</#', end: '>' },
  FTL_MACRO: { start: '<@', end: '>' },
  FTL_MACRO_CLOSE: { start: '</@', end: '>' }
};

export default juiceCheerio;
