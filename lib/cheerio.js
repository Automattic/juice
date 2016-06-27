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

var encodeEJS = function(html) {
  return html.replace(/<%((.|\s)*?)%>/g, function(match, subMatch) {
    return '<!--EJS <%' + subMatch + '%> -->';
  });
};

var decodeEJS = function(html) {
  return html.replace(/<!--EJS <%((.|\s)*?)%> -->/g, function(match, subMatch) {
    return '<%' + subMatch + '%>';
  });
};

var encodeEntities = function(html) {
  return encodeEJS(html);
};

var decodeEntities = function(html) {
  return decodeEJS(html);
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
