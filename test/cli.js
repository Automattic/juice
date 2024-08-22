'use strict';

var assert = require('assert');
var fs = require('fs');
var spawn = require('cross-spawn');
var cli = require('../lib/cli');

before(function() {
  if (fs.existsSync('tmp')) { return; }
  fs.mkdirSync('tmp');
});

it('cli parses options', function(done) {
  const parseArgs = (args) => cli.argsToOptions({ getOptionValue: (arg) => args[arg] });
  assert.strictEqual(parseArgs({'css': 'file.css'}).cssFile, 'file.css');
  assert.strictEqual(parseArgs({'optionsFile': 'options.json'}).optionsFile, 'options.json');
  assert.strictEqual(parseArgs({'extraCss': 'body{color:red;}'}).extraCss, 'body{color:red;}');
  assert.strictEqual(parseArgs({'insertPreservedExtraCss': 'true'}).insertPreservedExtraCss, true);
  assert.strictEqual(parseArgs({'applyStyleTags': 'true'}).applyStyleTags, true);
  assert.strictEqual(parseArgs({'removeStyleTags': 'true'}).removeStyleTags, true);
  assert.strictEqual(parseArgs({'preserveImportant': 'true'}).preserveImportant, true);
  assert.strictEqual(parseArgs({'preserveMediaQueries': 'true'}).preserveMediaQueries, true);
  assert.strictEqual(parseArgs({'preserveFontFaces': 'true'}).preserveFontFaces, true);
  assert.strictEqual(parseArgs({'preserveKeyFrames': 'true'}).preserveKeyFrames, true);
  assert.strictEqual(parseArgs({'applyWidthAttributes': 'true'}).applyWidthAttributes, true);
  assert.strictEqual(parseArgs({'applyHeightAttributes': 'true'}).applyHeightAttributes, true);
  assert.strictEqual(parseArgs({'applyAttributesTableElements': 'true'}).applyAttributesTableElements, true);
  assert.strictEqual(parseArgs({'xmlMode': 'true'}).xmlMode, true);
  assert.strictEqual(parseArgs({'resolveCSSVariables': 'true'}).resolveCSSVariables, true);
  assert.strictEqual(parseArgs({'webResourcesInlineAttribute': 'true'}).webResources.inlineAttribute, true);
  assert.strictEqual(parseArgs({'webResourcesImages': '12'}).webResources.images, 12);
  assert.strictEqual(parseArgs({'webResourcesLinks': 'true'}).webResources.links, true);
  assert.strictEqual(parseArgs({'webResourcesScripts': '24'}).webResources.scripts, 24);
  assert.strictEqual(parseArgs({'webResourcesRelativeTo': 'web'}).webResources.relativeTo, 'web');
  assert.strictEqual(parseArgs({'webResourcesRebaseRelativeTo': 'root'}).webResources.rebaseRelativeTo, 'root');
  assert.strictEqual(parseArgs({'webResourcesStrict': 'true'}).webResources.strict, true);
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

it('cli supports codeBlock', function(done) {
  var htmlPath = 'test/cases/cli/code-block-cli.html';
  var optionsFilePath = 'test/cases/cli/code-block-cli.json';
  var expectedPath = 'test/cases/cli/code-block-cli.out';
  var outputPath = 'tmp/code-block-cli.out';

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
