
var juice = require('../')
  , utils = require('../lib/utils')
  , basename = require('path').basename
  , fs = require('fs')
  , assert = require('assert');


/**
 * Auto-load and run tests.
 */

var files = fs.readdirSync( __dirname + '/cases' );
files.forEach(function(file) {
  if( /\.html$/.test( file ) ) {
    var name = basename( file, '.html' );
    it(name, test(name, false));
  }
});

var optionFiles = fs.readdirSync( __dirname + '/cases/juice-content' );

optionFiles.forEach(function(file) {
  if( /\.html$/.test( file ) ) {
    var name = 'juice-content/' + basename( file, '.html' );
    it(name, test(name, true));
  }
});

function read (file) {
  return fs.readFileSync(file, 'utf8');
}

function test (testName, options) {
  var base = __dirname + '/cases/' + testName
    , html =  read(base + '.html')
    , css = read( base + '.css' )
    , config = options ? JSON.parse( read( base + '.json' ) ) : null;

  options = {};

  return function(done) {
    var onJuiced = function ( err, actual )
    {
      if(err){
        return done(err);
      }
      var expected = read(base + '.out');
      assert.equal(utils.normalizeLineEndings(actual.trim()), utils.normalizeLineEndings(expected.trim()));
      done();
    };

    if(config === null) {
      juice.inlineContent(html, css, options, onJuiced);
    }
    else {
      juice.juiceContent(html, config, onJuiced);
    }
  };
}