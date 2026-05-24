'use strict';

import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
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
    assert.strictEqual(
      utils.normalizeLineEndings(expected.trim()),
      utils.normalizeLineEndings(actual.trim())
    );
  });
});

it('inlineContent', function() {
  const html = '<p>Hello</p>';
  const css = 'p{font-weight:bold;}';

  assert.strictEqual(juice.inlineContent(html, css), '<p style="font-weight: bold;">Hello</p>');
});
