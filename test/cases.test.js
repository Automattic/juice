'use strict';

const fs = require('fs');
const assert = require('assert');
const { basename } = require('path');
const cheerio = require('cheerio');
const htmlparser2 = require('htmlparser2');
const juice = require('../');
const utils = require('../lib/utils');

/**
 * Auto-load and run tests.
 */

const files = fs.readdirSync(__dirname + '/cases');
files.forEach((file) => {
  if (/\.html$/.test(file)) {
    const name = basename(file, '.html');
    it(name, runCase(name, false));
  }
});

it('juice(html)', () => {
  const expected = '<div style="color: red;"></div>';
  const actual = juice('<style>div{color:red;}</style><div/>');
  assert.equal(utils.normalizeLineEndings(actual.trim()), utils.normalizeLineEndings(expected.trim()));
});

it('juice(document) with htmlparser2', () => {
  const dom = htmlparser2.parseDocument('<style>div{color:red;}</style><div/>');
  const $ = cheerio.load(dom, { xml: true });

  const expected = '<div style="color: red;"/>';
  juice.juiceDocument($);
  const actual = $.html();
  assert.equal(utils.normalizeLineEndings(actual.trim()), utils.normalizeLineEndings(expected.trim()));
});

const optionFiles = fs.readdirSync(__dirname + '/cases/juice-content');

optionFiles.forEach((file) => {
  if (/\.html$/.test(file)) {
    const name = 'juice-content/' + basename(file, '.html');
    it(name, runCase(name, true));
  }
});

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {}
}

function runCase(testName, useResources) {
  const base = __dirname + '/cases/' + testName;
  const html = read(base + '.html');
  const css = read(base + '.css');
  const rawConfig = read(base + '.json');
  const config = rawConfig ? JSON.parse(rawConfig) : null;

  return () => new Promise((resolve, reject) => {
    const onJuiced = (err, actual) => {
      if (err) return reject(err);
      const expected = read(base + '.out');
      try {
        assert.equal(
          utils.normalizeLineEndings(actual.trim()),
          utils.normalizeLineEndings(expected.trim())
        );
        resolve();
      } catch (assertionErr) {
        reject(assertionErr);
      }
    };

    if (!useResources) {
      onJuiced(null, juice.inlineContent(html, css, config));
    } else {
      juice.juiceResources(html, config, onJuiced);
    }
  });
}
