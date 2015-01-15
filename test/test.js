/*globals describe:false it:false*/
var juice = require('../')
  , path = require('path')
  , fs = require('fs')
  , Batch = require('batch')
  , assert = require('assert')

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
      var filePath = path.join(__dirname, "html", testName + ".in.html");
      juice(filePath, cb);
    });
    batch.push(function(cb) {
      fs.readFile(path.join(__dirname, "html", testName + ".out.html"), 'utf8', cb);
    });
    batch.end(function(err, results) {
      if (err) return cb(err);
      console.log(results[0].trim());
      assert.strictEqual(results[1].trim(), results[0].trim());
      cb();
    });
  };
}
