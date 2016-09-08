'use strict';

var assert = require('assert');
var path = require('path');
var fs = require('fs');
var spawn = require('cross-spawn');
var cli = require('../lib/cli');

before(function() {
  if (fs.existsSync('tmp')) { return; }
  fs.mkdirSync('tmp');
});

it('cli parses options', function(done) {
  assert.strictEqual(cli.argsToOptions({'css': 'file.css'}).cssFile, 'file.css');
  assert.strictEqual(cli.argsToOptions({'optionsFile': 'options.json'}).optionsFile, 'options.json');
  assert.strictEqual(cli.argsToOptions({'extraCss': 'body{color:red;}'}).extraCss, 'body{color:red;}');
  assert.strictEqual(cli.argsToOptions({'insertPreservedExtraCss': 'true'}).insertPreservedExtraCss, true);
  assert.strictEqual(cli.argsToOptions({'applyStyleTags': 'true'}).applyStyleTags, true);
  assert.strictEqual(cli.argsToOptions({'removeStyleTags': 'true'}).removeStyleTags, true);
  assert.strictEqual(cli.argsToOptions({'preserveMediaQueries': 'true'}).preserveMediaQueries, true);
  assert.strictEqual(cli.argsToOptions({'preserveFontFaces': 'true'}).preserveFontFaces, true);
  assert.strictEqual(cli.argsToOptions({'applyWidthAttributes': 'true'}).applyWidthAttributes, true);
  assert.strictEqual(cli.argsToOptions({'applyHeightAttributes': 'true'}).applyHeightAttributes, true);
  assert.strictEqual(cli.argsToOptions({'applyAttributesTableElements': 'true'}).applyAttributesTableElements, true);
  assert.strictEqual(cli.argsToOptions({'xmlMode': 'true'}).xmlMode, true);
  assert.strictEqual(cli.argsToOptions({'webResourcesInlineAttribute': 'true'}).webResources.inlineAttribute, true);
  assert.strictEqual(cli.argsToOptions({'webResourcesImages': '12'}).webResources.images, 12);
  assert.strictEqual(cli.argsToOptions({'webResourcesLinks': 'true'}).webResources.links, true);
  assert.strictEqual(cli.argsToOptions({'webResourcesScripts': '24'}).webResources.scripts, 24);
  assert.strictEqual(cli.argsToOptions({'webResourcesRelativeTo': 'web'}).webResources.relativeTo, 'web');
  assert.strictEqual(cli.argsToOptions({'webResourcesRebaseRelativeTo': 'root'}).webResources.rebaseRelativeTo, 'root');
  assert.strictEqual(cli.argsToOptions({'webResourcesCssmin': 'true'}).webResources.cssmin, true);
  assert.strictEqual(cli.argsToOptions({'webResourcesUglify': 'true'}).webResources.uglify, true);
  assert.strictEqual(cli.argsToOptions({'webResourcesStrict': 'true'}).webResources.strict, true);
  done();
});

it('cli no css', function(done) {
  var inputPath = 'test/cases/juice-content/no-css.html';
  var expectedPath = 'test/cases/juice-content/no-css.out';
  var outputPath = 'tmp/no-css.out';

  var juiceProcess = spawn('bin/juice', [inputPath, outputPath]);

  juiceProcess.on('error', done);

  juiceProcess.on('exit', function(code) {
    assert(code === 0, 'Expected exit code to be 0');
    var output = fs.readFileSync(outputPath, 'utf8');
    var expectedOutput = fs.readFileSync(expectedPath, 'utf8');
    assert.equal(output, expectedOutput);
    done();
  });
});

it('cli css included', function(done) {
  var htmlPath = 'test/cases/integration.html';
  var cssPath = 'test/cases/integration.css';
  var expectedPath = 'test/cases/integration.out';
  var outputPath = 'tmp/integration.out';

  var juiceProcess = spawn('bin/juice', [htmlPath, '--css', cssPath, '--apply-width-attributes', 'false', outputPath]);

  juiceProcess.on('error', done);

  juiceProcess.on('exit', function(code) {
    assert(code === 0, 'Expected exit code to be 0');
    var output = fs.readFileSync(outputPath, 'utf8');
    var expectedOutput = fs.readFileSync(expectedPath, 'utf8');
    assert.equal(output, expectedOutput);
    done();
  });
});

it('cli options included', function(done) {
  var htmlPath = 'test/cases/juice-content/font-face-preserve.html';
  var optionsFilePath = 'test/cases/juice-content/font-face-preserve.json';
  var expectedPath = 'test/cases/juice-content/font-face-preserve.out';
  var outputPath = 'tmp/font-face-preserve.out';

  var juiceProcess = spawn('bin/juice', [htmlPath, '--options-file', optionsFilePath, outputPath]);

  juiceProcess.on('error', done);

  juiceProcess.on('exit', function(code) {
    assert(code === 0, 'Expected exit code to be 0');
    var output = fs.readFileSync(outputPath, 'utf8').replace(/\r/g, '');
    var expectedOutput = fs.readFileSync(expectedPath, 'utf8');
    assert.equal(output, expectedOutput);
    done();
  });
});
