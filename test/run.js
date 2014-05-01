
/*!
 * Test runner based on Stylus test runner.
 */

/**
 * Module dependencies.
 */

var juice = require('../')
  , basename = require('path').basename
  , fs = require('fs')

/**
 * Test count.
 */

var count = 0;

/**
 * Failure count.
 */

var failures = 0;

/**
 * Test the given `test`.
 *
 * @param {String} test
 * @param {Function} fn
 */

function test (testName, fn, options) {
  var base = __dirname + '/cases/' + testName
    , html =  read(base + '.html')
    , css = read( base + '.css' )
    , config = options ? JSON.parse( read( base + '.json' ) ) : null

  function read (file) {
    return fs.readFileSync(file, 'utf8');
  }

  var onDone = function ( err, actual )
  {
  	var expected = read( base + '.out' );

  	if ( actual.trim() === expected.trim() )
  	{
  		fn();
  	} else
  	{
  		fn( actual, expected );
  	}
  };

  if ( config === null )
  {
  	// use the legacy invocation to test backward compatibility
  	var actual = juice( html, css );
  	onDone( null, actual );
  }
  else
  {
  	juice.juiceContent( html, config, onDone );
  }

  return testName;
}

/**
 * Auto-load and run tests.
 */

fs.readdir( __dirname + '/cases', function ( err, files ) {
  if ( err ) throw err;
  var tests = [];

  files.forEach( function ( file )
  {
    if ( /\.html$/.test( file ) ) {
      ++count;
      tests.push( { basename: basename( file, '.html' ) } );
    }
  } );

  fs.readdir( __dirname + '/cases/juice-content', function ( err, files )
  {
    if ( err ) throw err;

    files.forEach( function ( file )
    {
      if ( /\.html$/.test( file ) ) {
        ++count;
        tests.push( { basename: 'juice-content/' + basename( file, '.html' ), options: true } );
      }
    } );

    nextTest( tests );
  } );
} );


function nextTest( tests )
{
  curr = tests.shift();
  if ( !curr ) return done();
  process.stderr.write( '    \033[90m' + curr.basename + '\033[0m' );
  test( curr.basename, function ( actual, expected )
  {
    if ( actual ) {
      ++failures;
      console.error( '\r  \033[31m✖\033[0m \033[90m' + curr.basename + '\033[0m\n' );
      diff( actual, expected );
      console.error();
    } else {
      console.error( '\r  \033[36m✔\033[0m \033[90m' + curr.basename + '\033[0m' );
    }
    nextTest( tests );
  }, curr.options );
}

/**
 * Diff `actual` / `expected`.
 *
 * @param {String} actual
 * @param {String} expected
 */

function diff (actual, expected) {
  actual = actual.split('\n');
  expected = expected.split('\n');
  var len = largestLineIn(expected);

  expected.forEach(function(line, i){
    if (!line.length && i === expected.length - 1) return;
    var other = actual[i]
      , pad = len - line.length;
    pad = (new Array(++pad)).join(' ');
    var same = line === other;
    if (same) {
      console.error('  %d| %j%s | %j', i+1, line, pad, other);
    } else {
      console.error('  \033[31m%d| %j%s | %j\033[0m', i+1, line, pad, other);
    }
  });
}

/**
 * Return the length of the largest line in `lines`.
 *
 * @param {Array} lines
 * @return {Number}
 */

function largestLineIn(lines) {
  return lines.reduce(function(n, line){
    return Math.max(n, line.length);
  }, 0);
}

/**
 * Done!!!
 */

function done () {
  console.log();
  console.log(
      '  \033[90mcompleted\033[0m' +
      ' \033[32m%d\033[0m' +
      ' \033[90mtests\033[0m', count);

  if (failures) {
    console.error('  \033[90mfailed\033[0m' +
        ' \033[31m%d\033[0m' +
        ' \033[90mtests\033[0m', failures);
    process.exit(failures);
  }

  console.log();
}
