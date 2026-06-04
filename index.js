/**
 * Module dependencies.
 */

import fs from 'fs';
import path from 'path';
import inline from 'web-resource-inliner';
import * as utils from './lib/utils.js';
import juiceClient from './client.js';
import cheerio from './lib/cheerio.js';
import packageJson from './package.json' with { type: 'json' };

const juice = juiceClient;

juice.version = packageJson.version;

juice.Selector = utils.Selector;
juice.Property = utils.Property;
juice.utils = utils;

juice.juiceFile = juiceFile;
juice.juiceResources = juiceResources;
juice.inlineExternal = inlineExternal;

export default juice;

function juiceFile(filePath, options, callback) {
  // set default options
  fs.readFile(filePath, 'utf8', function(err, content) {
    if (err) {
      return callback(err);
    }
    options = utils.getDefaultOptions(options); // so we can mutate options without guilt
    // Optional support for codeBlocks within optionsFile
    if (options.codeBlocks) {
      Object.keys(options.codeBlocks).forEach(function(key) {
        juice.codeBlocks[key] = options.codeBlocks[key];
      });
    }
    if (!options.webResources.relativeTo) {
      const rel = path.dirname(path.relative(process.cwd(), filePath));
      options.webResources.relativeTo = rel;
    }
    juiceResources(content, options, callback);
  });
}

function inlineExternal(html, inlineOptions, callback) {
  const options = Object.assign({ fileContent: html }, inlineOptions);
  inline.html(options, callback);
}

function juiceResources(html, options, callback) {
  options = utils.getDefaultOptions(options);

  const onInline = function(err, html) {
    if (err) {
      return callback(err);
    }

    return callback(null,
      cheerio(html, { xmlMode: options && options.xmlMode }, juiceClient.juiceDocument, [options])
    );
  };

  options.webResources.relativeTo = options.webResources.relativeTo || options.url; // legacy support
  juice.inlineExternal(html, options.webResources, onInline);
}
