'use strict';

var juice = require('../');
var utils = require('../lib/utils');
var basename = require('path').basename;
var fs = require('fs');
var assert = require('assert');


/**
 * Auto-load and run tests.
 */

var files = fs.readdirSync(__dirname + '/cases');
files.forEach(function(file) {
  if (/\.html$/.test(file)) {
    var name = basename(file, '.html');
    it(name, test(name, false));
  }
});

it('juice(html)', function() {
  var expected = '<div style="color: red;"></div>';
  var actual = juice('<style>div{color:red;}</style><div/>');
  assert.equal(utils.normalizeLineEndings(actual.trim()), utils.normalizeLineEndings(expected.trim()));
});

var optionFiles = fs.readdirSync(__dirname + '/cases/juice-content');

optionFiles.forEach(function(file) {
  if (/\.html$/.test(file)) {
    var name = 'juice-content/' + basename(file, '.html');
    it(name, test(name, true));
  }
});

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function test(testName, options) {
  var base = __dirname + '/cases/' + testName;
  var html =  read(base + '.html');
  var css = read(base + '.css');
  var config = options ? JSON.parse(read(base + '.json')) : null;

  options = {};

  return function(done) {
    var onJuiced = function(err, actual) {
      if (err) {
        return done(err);
      }
      var expected = read(base + '.out');
      assert.equal(utils.normalizeLineEndings(actual.trim()), utils.normalizeLineEndings(expected.trim()));
      done();
    };

    if (config === null) {
      onJuiced(null, juice.inlineContent(html, css, options));
    } else {
      juice.juiceResources(html, config, onJuiced);
    }
  };
}
