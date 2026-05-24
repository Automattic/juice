'use strict';

const assert = require('assert');
const fs = require('fs');
const spawn = require('cross-spawn');
const cli = require('../lib/cli');

beforeAll(function() {
  if (fs.existsSync('tmp')) { return; }
  fs.mkdirSync('tmp');
});

it('cli parses options', function() {
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
  assert.strictEqual(parseArgs({'decodeStyleAttributes': 'true'}).decodeStyleAttributes, true);
  assert.strictEqual(parseArgs({'webResourcesInlineAttribute': 'true'}).webResources.inlineAttribute, true);
  assert.strictEqual(parseArgs({'webResourcesImages': '12'}).webResources.images, 12);
  assert.strictEqual(parseArgs({'webResourcesLinks': 'true'}).webResources.links, true);
  assert.strictEqual(parseArgs({'webResourcesScripts': '24'}).webResources.scripts, 24);
  assert.strictEqual(parseArgs({'webResourcesRelativeTo': 'web'}).webResources.relativeTo, 'web');
  assert.strictEqual(parseArgs({'webResourcesRebaseRelativeTo': 'root'}).webResources.rebaseRelativeTo, 'root');
  assert.strictEqual(parseArgs({'webResourcesStrict': 'true'}).webResources.strict, true);
});

function runCli(args, expectedPath, outputPath, { stripCr = false } = {}) {
  return new Promise((resolve, reject) => {
    const juiceProcess = spawn('bin/juice', args);
    juiceProcess.on('error', reject);
    juiceProcess.on('exit', (code) => {
      try {
        assert(code === 0, 'Expected exit code to be 0');
        let output = fs.readFileSync(outputPath, 'utf8');
        if (stripCr) output = output.replace(/\r/g, '');
        const expected = fs.readFileSync(expectedPath, 'utf8');
        assert.equal(output, expected);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

it('cli no css', function() {
  const inputPath = 'test/cases/juice-content/no-css.html';
  const expectedPath = 'test/cases/juice-content/no-css.out';
  const outputPath = 'tmp/no-css.out';
  return runCli([inputPath, outputPath], expectedPath, outputPath);
});

it('cli css included', function() {
  const htmlPath = 'test/cases/integration.html';
  const cssPath = 'test/cases/integration.css';
  const expectedPath = 'test/cases/integration.out';
  const outputPath = 'tmp/integration.out';
  return runCli(
    [htmlPath, '--css', cssPath, '--apply-width-attributes', 'false', outputPath],
    expectedPath,
    outputPath
  );
});

it('cli options included', function() {
  const htmlPath = 'test/cases/juice-content/font-face-preserve.html';
  const optionsFilePath = 'test/cases/juice-content/font-face-preserve.json';
  const expectedPath = 'test/cases/juice-content/font-face-preserve.out';
  const outputPath = 'tmp/font-face-preserve.out';
  return runCli(
    [htmlPath, '--options-file', optionsFilePath, outputPath],
    expectedPath,
    outputPath,
    { stripCr: true }
  );
});

it('cli supports codeBlock', function() {
  const htmlPath = 'test/cases/cli/code-block-cli.html';
  const optionsFilePath = 'test/cases/cli/code-block-cli.json';
  const expectedPath = 'test/cases/cli/code-block-cli.out';
  const outputPath = 'tmp/code-block-cli.out';
  return runCli(
    [htmlPath, '--options-file', optionsFilePath, outputPath],
    expectedPath,
    outputPath,
    { stripCr: true }
  );
});
