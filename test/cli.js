var assert = require('assert');
var path = require('path');
var fs = require('fs');
var spawn = require('win-spawn');
var cli = require('../lib/cli');

before(function () {
  if (fs.existsSync('tmp')) { return; }
  fs.mkdirSync('tmp');
});

it('cli parses options', function (done) {
  assert.strictEqual(cli.argsToOptions({css:"file.css"}).cssFile, "file.css");
  assert.strictEqual(cli.argsToOptions({"extra-css":"body{color:red;}"}).extraCss, "body{color:red;}");
  assert.strictEqual(cli.argsToOptions({"apply-style-tags":true}).applyStyleTags, true);
  assert.strictEqual(cli.argsToOptions({"remove-style-tags":true}).removeStyleTags, true);
  assert.strictEqual(cli.argsToOptions({"preserve-media-queries":true}).preserveMediaQueries, true);
  assert.strictEqual(cli.argsToOptions({"preserve-font-faces":true}).preserveFontFaces, true);
  assert.strictEqual(cli.argsToOptions({"apply-width-attributes":true}).applyWidthAttributes, true);
  assert.strictEqual(cli.argsToOptions({"apply-height-attributes":true}).applyHeightAttributes, true);
  assert.strictEqual(cli.argsToOptions({"apply-attributes-table-elements":true}).applyAttributesTableElements, true);
  assert.strictEqual(cli.argsToOptions({"web-resources-inline-attribute":true}).webResources.inlineAttribute, true);
  assert.strictEqual(cli.argsToOptions({"web-resources-images":12}).webResources.images, 12);
  assert.strictEqual(cli.argsToOptions({"web-resources-links":true}).webResources.links, true);
  assert.strictEqual(cli.argsToOptions({"web-resources-scripts":24}).webResources.scripts, 24);
  assert.strictEqual(cli.argsToOptions({"web-resources-relative-to":"web"}).webResources.relativeTo, "web");
  assert.strictEqual(cli.argsToOptions({"web-resources-rebase-relative-to":"root"}).webResources.rebaseRelativeTo, "root");
  assert.strictEqual(cli.argsToOptions({"web-resources-cssmin":true}).webResources.cssmin, true);
  assert.strictEqual(cli.argsToOptions({"web-resources-uglify":true}).webResources.uglify, true);
  assert.strictEqual(cli.argsToOptions({"web-resources-strict":true}).webResources.strict, true);
  done();
});

it('cli no css', function (done) {
  var inputPath = 'test/cases/juice-content/no-css.html';
  var expectedPath = 'test/cases/juice-content/no-css.out';
  var outputPath = 'tmp/no-css.out';

  var juiceProcess = spawn('bin/juice', [inputPath, outputPath]);

  juiceProcess.on('error', done);

  juiceProcess.on('exit', function (code) {
    assert(code === 0, 'Expected exit code to be 0');
    var output = fs.readFileSync(outputPath, 'utf8');
    var expectedOutput = fs.readFileSync(expectedPath, 'utf8');
    assert.equal(output, expectedOutput);
    done();
  });
});

it('cli css included', function (done) {
  var htmlPath = 'test/cases/integration.html';
  var cssPath = 'test/cases/integration.css';
  var expectedPath = 'test/cases/integration.out';
  var outputPath = 'tmp/integration.out';

  var juiceProcess = spawn('bin/juice', [htmlPath, '--css', cssPath, outputPath]);

  juiceProcess.on('error', done);

  juiceProcess.on('exit', function (code) {
    assert(code === 0, 'Expected exit code to be 0');
    var output = fs.readFileSync(outputPath, 'utf8');
    var expectedOutput = fs.readFileSync(expectedPath, 'utf8');
    assert.equal(output, expectedOutput);
    done();
  });
});
