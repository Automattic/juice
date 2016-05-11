/*globals describe:false it:false*/

'use strict';

var juice = require('../');
var utils = require('../lib/utils');
var path = require('path');
var fs = require('fs');
var Batch = require('batch');
var assert = require('assert');

var tests = [
  'doctype',
  'no_css',
  'two_styles',
  'remote_url',
  'spaces_in_path',
];

tests.forEach(function(testName) {
  it(testName, createIt(testName));
});

it('inlineContent', function() {
  var html = '<p>Hello</p>';
  var css = 'p{font-weight:bold;}';

  assert.strictEqual(juice.inlineContent(html, css), '<p style="font-weight: bold;">Hello</p>');
});

function createIt(testName) {
  return function(cb) {
    var batch = new Batch();
    batch.push(function(cb) {
      juice.juiceFile(path.join(__dirname, 'html', testName + '.in.html'), {}, cb);
    });
    batch.push(function(cb) {
      fs.readFile(path.join(__dirname, 'html', testName + '.out.html'), 'utf8', cb);
    });
    batch.end(function(err, results) {
      if (err) {
        return cb(err);
      }
      assert.strictEqual(utils.normalizeLineEndings(results[1].trim()), utils.normalizeLineEndings(results[0].trim()));
      cb();
    });
  };
}
