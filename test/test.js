/*globals describe:false it:false*/
var juice = require('../')
  , utils = require('../lib/utils')
  , path = require('path')
  , fs = require('fs')
  , Batch = require('batch')
  , assert = require('assert');

var tests = [
  "doctype",
  "no_css",
  "two_styles",
  "remote_url",
  "spaces_in_path",
];

tests.forEach(function(testName) {
  it(testName, createIt(testName));
});

function createIt(testName) {
  return function(cb) {
    var batch = new Batch();
    batch.push(function(cb) {
      juice.juiceFile(path.join(__dirname, "html", testName + ".in.html"), {}, cb);
    });
    batch.push(function(cb) {
      fs.readFile(path.join(__dirname, "html", testName + ".out.html"), 'utf8', cb);
    });
    batch.end(function(err, results) {
      if (err) return cb(err);
      assert.strictEqual(utils.normalizeLineEndings(results[1].trim()), utils.normalizeLineEndings(results[0].trim()));
      cb();
    });
  };
}
