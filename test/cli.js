var assert = require('assert');
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

before(function () {
  if (fs.existsSync('tmp')) { return; }
  fs.mkdirSync('tmp');
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
