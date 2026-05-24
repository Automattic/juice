/**
 * Module dependencies.
 */
import * as cheerio from 'cheerio';

const cheerioLoad = function(html, options, encodeEntities) {
  const { xmlMode, ...rest } = options;
  options = Object.assign({ xml: { decodeEntities: false, xmlMode } }, rest);
  html = encodeEntities(html);
  return cheerio.load(html, options);
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
  HBS: { start: '{{', end: '}}' }
};

export default juiceCheerio;
