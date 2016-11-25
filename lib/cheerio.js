'use strict';

/**
 * Module dependencies.
 */
var cheerio = require('cheerio');
var utils = require('./utils');

var cheerioLoad = function(html, options) {
  options = utils.extend({decodeEntities: false}, options || {});
  html = encodeEntities(html);
  return cheerio.load(html,options);
};

var encodeCodeBlocks = function(html) {
  var blocks = module.exports.codeBlocks;
  Object.keys(blocks).forEach(function(key) {
    var re = new RegExp(blocks[key].start + '((.|\\s)*?)' + blocks[key].end, 'g');
    html = html.replace(re, function(match, subMatch) {
      return '<!--' + key + ' ' + blocks[key].start + subMatch + blocks[key].end + ' -->';
    });
  });
  return html;
};

var decodeCodeBlocks = function(html) {
  var blocks = module.exports.codeBlocks;
  Object.keys(blocks).forEach(function(key) {
    var re = new RegExp('<!--' + key + ' ' + blocks[key].start + '((.|\\s)*?)' + blocks[key].end + ' -->', 'g');
    html = html.replace(re, function(match, subMatch) {
      return blocks[key].start + subMatch + blocks[key].end;
    });
  });
  return html;
};

var encodeEntities = function(html) {
  return encodeCodeBlocks(html);
};

var decodeEntities = function(html) {
  return decodeCodeBlocks(html);
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
module.exports = function(html, options, callback, callbackExtraArguments) {
  var $ = cheerioLoad(html, options);
  var args = [ $ ];
  args.push.apply(args, callbackExtraArguments);
  var doc = callback.apply(undefined, args) || $;

  if (options && options.xmlMode) {
    return doc.xml();
  }
  return decodeEntities(doc.html());
};

module.exports.codeBlocks = {
  EJS: { start: '<%', end: '%>' },
  HBS: { start: '{{', end: '}}' }
};
