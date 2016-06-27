'use strict';

/**
 * Module dependencies.
 */

var cheerio = require('cheerio');
var utils = require('./utils');

/**
 * Returns a Cheerio object
 *
 * api public
 */

exports.cheerio = function(html, options) {
  options = utils.extend({decodeEntities: false}, options || {});
  html = exports.encodeEntities(html);
  return cheerio.load(html,options);
};

exports.encodeEJS = function(html) {
  return html.replace(/<%((.|\s)*?)%>/g, function(match, subMatch) {
    return '<!--EJS <%' + subMatch + '%> -->';
  });
};

exports.decodeEJS = function(html) {
  return html.replace(/<!--EJS <%((.|\s)*?)%> -->/g, function(match, subMatch) {
    return '<%' + subMatch + '%>';
  });
};

exports.encodeEntities = function(html) {
  return exports.encodeEJS(html);
};

exports.decodeEntities = function(html) {
  return exports.decodeEJS(html);
};

