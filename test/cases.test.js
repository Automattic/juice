import fs from 'fs';
import { basename } from 'path';
import * as cheerio from 'cheerio';
import * as htmlparser2 from 'htmlparser2';
import juice from '../index.js';
import * as utils from '../lib/utils.js';

const __dirname = import.meta.dirname;

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
  expect(utils.normalizeLineEndings(actual.trim())).toBe(utils.normalizeLineEndings(expected.trim()));
});

it('juice(document) with htmlparser2', () => {
  const dom = htmlparser2.parseDocument('<style>div{color:red;}</style><div/>');
  const $ = cheerio.load(dom, { xml: true });

  const expected = '<div style="color: red;"/>';
  juice.juiceDocument($);
  const actual = $.html();
  expect(utils.normalizeLineEndings(actual.trim())).toBe(utils.normalizeLineEndings(expected.trim()));
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
        expect(utils.normalizeLineEndings(actual.trim()))
          .toBe(utils.normalizeLineEndings(expected.trim()));
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (!useResources) {
      onJuiced(null, juice.inlineContent(html, css, config));
    } else {
      juice.juiceResources(html, config, onJuiced);
    }
  });
}
