import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import juice from '../index.js';
import * as utils from '../lib/utils.js';

const __dirname = import.meta.dirname;

const juiceFile = promisify(juice.juiceFile);
const readFile = promisify(fs.readFile);

const tests = [
  'doctype',
  'no_css',
  'two_styles',
  'remote_url',
  'spaces_in_path',
];

tests.forEach((testName) => {
  it(testName, async () => {
    const [actual, expected] = await Promise.all([
      juiceFile(path.join(__dirname, 'html', testName + '.in.html'), {}),
      readFile(path.join(__dirname, 'html', testName + '.out.html'), 'utf8'),
    ]);
    expect(utils.normalizeLineEndings(expected.trim()))
      .toBe(utils.normalizeLineEndings(actual.trim()));
  });
});

it('inlineContent', function() {
  const html = '<p>Hello</p>';
  const css = 'p{font-weight:bold;}';

  expect(juice.inlineContent(html, css)).toBe('<p style="font-weight: bold;">Hello</p>');
});

it('juiceFile rejects when the input file is missing', async () => {
  let caught;
  try {
    await juiceFile('/this/path/should/not/exist.html', {});
  } catch (err) { caught = err; }
  expect(caught).toBeDefined();
  expect(caught.code).toBe('ENOENT');
});

it('juiceFile merges options.codeBlocks into juice.codeBlocks', async () => {
  const originalCodeBlocks = { ...juice.codeBlocks };
  try {
    await juiceFile(path.join(__dirname, 'html', 'no_css.in.html'), {
      codeBlocks: {
        TWIG: { start: '{%', end: '%}' },
      },
    });
    expect(juice.codeBlocks.TWIG).toStrictEqual({ start: '{%', end: '%}' });
  } finally {
    juice.codeBlocks = originalCodeBlocks;
  }
});

it('juiceResources propagates errors from inlineExternal', () => new Promise((resolve, reject) => {
  const originalInlineExternal = juice.inlineExternal;
  juice.inlineExternal = (_html, _opts, cb) => cb(new Error('inline boom'));
  juice.juiceResources('<p>hi</p>', {}, (err) => {
    juice.inlineExternal = originalInlineExternal;
    try {
      expect(err).toBeTruthy();
      expect(err.message).toBe('inline boom');
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}));
