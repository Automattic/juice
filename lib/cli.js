import path from 'path';
import fs from 'fs';
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import juiceDefault from '../index.js';

const cli = {};

export default cli;

cli.getProgram = function(argv) {
  const program = new Command();

  program
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version)
    .argument('[input.html]', 'input HTML file')
    .argument('[output.html]', 'output HTML file');

  Object.keys(cli.options).forEach((key) => {
    program.option('--' + key + ' [value]', cli.options[key].def);
  });

  program.parse(argv || process.argv);

  return program;
};

cli.options = {
  'css': {
    pMap: 'css',
    map: 'cssFile',
    def: 'Add an extra CSS file by name' },
  'options-file': {
    pMap: 'optionsFile',
    def: 'Load options from a JSON file' },
  'extra-css': {
    pMap: 'extraCss',
    def: 'Add extra CSS' },
  'insert-preserved-extra-css': {
    pMap: 'insertPreservedExtraCss',
    def: 'insert preserved @font-face and @media into document?',
    coercion: JSON.parse },
  'apply-style-tags': {
    pMap: 'applyStyleTags',
    def: 'inline from style tags?',
    coercion: JSON.parse },
  'remove-style-tags': {
    pMap: 'removeStyleTags',
    def: 'remove style tags?',
    coercion: JSON.parse },
  'preserve-important': {
    pMap: 'preserveImportant',
    def: 'preserve important?',
    coercion: JSON.parse },
  'preserve-media-queries': {
    pMap: 'preserveMediaQueries',
    def: 'preserve media queries?',
    coercion: JSON.parse },
  'preserve-font-faces': {
    pMap: 'preserveFontFaces',
    def: 'preserve font faces?',
    coercion: JSON.parse },
  'preserve-key-frames': {
    pMap: 'preserveKeyFrames',
    def: 'preserve key frames?',
    coercion: JSON.parse },
  'preserve-pseudos': {
    pMap: 'preservePseudos',
    def: 'preserve pseudo selectors?',
    coercion: JSON.parse },
  'apply-width-attributes': {
    pMap: 'applyWidthAttributes',
    def: 'apply width attributes to relevent elements?',
    coercion: JSON.parse },
  'apply-height-attributes': {
    pMap: 'applyHeightAttributes',
    def: 'apply height attributes to relevent elements?',
    coercion: JSON.parse },
  'apply-attributes-table-elements': {
    pMap: 'applyAttributesTableElements',
    def: 'apply attributes with and equivalent CSS value to table elements?',
    coercion: JSON.parse },
  'xml-mode': {
    pMap: 'xmlMode',
    def: 'generate output with tags closed?  input must be valid XML',
    coercion: JSON.parse },
  'resolve-css-variables': {
    pMap: 'resolveCSSVariables',
    def: 'resolve CSS variables',
    coercion: JSON.parse },
  'web-resources-inline-attribute': {
    pMap: 'webResourcesInlineAttribute',
    map: 'inlineAttribute',
    def: 'see docs for web-resource-inliner inlineAttribute',
    coercion: JSON.parse },
  'web-resources-images': {
    pMap: 'webResourcesImages',
    map: 'images',
    def: 'see docs for web-resource-inliner images',
    coercion: JSON.parse },
  'web-resources-links': {
    pMap: 'webResourcesLinks',
    map: 'links',
    def: 'see docs for web-resource-inliner links',
    coercion: JSON.parse },
  'web-resources-scripts': {
    pMap: 'webResourcesScripts',
    map: 'scripts',
    def: 'see docs for web-resource-inliner scripts',
    coercion: JSON.parse },
  'web-resources-relative-to': {
    pMap: 'webResourcesRelativeTo',
    map: 'relativeTo',
    def: 'see docs for web-resource-inliner relativeTo' },
  'web-resources-rebase-relative-to': {
    pMap: 'webResourcesRebaseRelativeTo',
    map: 'rebaseRelativeTo',
    def: 'see docs for web-resource-inliner rebaseRelativeTo' },
  'web-resources-strict': {
    pMap: 'webResourcesStrict',
    map: 'strict',
    def: 'see docs for web-resource-inliner strict',
    coercion: JSON.parse },
  'decode-style-attributes': {
    pMap: 'decodeStyleAttributes',
    def: 'decode the value of `style=` attributes?',
    coercion: JSON.parse }
};

cli.argsToOptions = function(program) {
  const result = { webResources: {} };
  Object.keys(cli.options).forEach((key) => {
    const option = cli.options[key];
    let value = program.getOptionValue(option.pMap);
    if (value !== undefined) {
      if (option.coercion) {
        value = option.coercion(value);
      }

      if (option.pMap.match(/webResources/)) {
        result.webResources[option.map] = value;
      } else {
        result[option.map || option.pMap] = value;
      }
    }
  });

  return result;
};

cli.run = function(argv, deps) {
  deps = deps || {};
  const exit = deps.exit || process.exit;
  const error = deps.error || console.error.bind(console);
  const cwd = deps.cwd || process.cwd();
  const fsImpl = deps.fs || fs;
  const juice = deps.juice || juiceDefault;
  const done = deps.done || (() => {});

  const program = cli.getProgram(argv);

  if (program.args.length < 2) {
    program.help();
    return;
  }

  const [inputFile, outputFile] = program.args;
  let options = cli.argsToOptions(program);

  if (options.optionsFile) {
    const optionsFromFile = JSON.parse(
      fs.readFileSync(path.resolve(cwd, options.optionsFile), 'utf8')
    );
    options = Object.assign({}, optionsFromFile, options, {
      webResources: Object.assign(
        {},
        optionsFromFile && optionsFromFile.webResources,
        options && options.webResources
      )
    });
  }

  const handleError = (err) => {
    if (err) {
      error(err.stack);
      exit(1);
      done(err);
      return true;
    }
    return false;
  };

  const finish = () => {
    delete options.cssFile;
    delete options.optionsFile;
    juice.juiceFile(inputFile, options, (err, html) => {
      if (handleError(err)) return;
      fsImpl.writeFile(outputFile, html, (writeErr) => {
        if (handleError(writeErr)) return;
        done();
      });
    });
  };

  if (options.cssFile) {
    fsImpl.readFile(options.cssFile, (err, css) => {
      if (handleError(err)) return;
      options.extraCss = css.toString();
      finish();
    });
  } else {
    finish();
  }
};
