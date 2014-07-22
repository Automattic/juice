var juice = require('../');
var path = require('path');
var fs = require('fs');
var Pend = require('pend');
var assert = require('assert');

var it = global.it;

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
    var pend = new Pend();
    var expected, actual;
    pend.go(function(cb) {
      var filePath = path.join(__dirname, "html", testName + ".in.html");
      juice(filePath, function(err, val) {
        actual = val;
        cb(err);
      });
    });
    pend.go(function(cb) {
      fs.readFile(path.join(__dirname, "html", testName + ".out.html"), 'utf8', function(err, val) {
        expected = val;
        cb(err);
      });
    });
    pend.wait(function(err) {
      if (err) return cb(err);
      assert.strictEqual(actual.trim(), expected.trim());
      cb();
    });
  };
}
