'use strict';

/*!
 * Juice unit tests.
 */

/**
 * Test dependencies.
 */

var juice = require('../');
var Selector = juice.Selector;
var Property = juice.Property;
var utils = juice.utils;
var assert = require('assert');

/**
 * Tests.
 */

it('extracting selectors', function() {
  var extract = utils.extract;

  assert.deepEqual(extract('#a'),['#a']);
  assert.deepEqual(extract('#a, .b'),['#a', '.b']);
  assert.deepEqual(extract('#a, .b,'),['#a', '.b']);
  assert.deepEqual(extract('.test.a, #a.b'),['.test.a', '#a.b']);
  assert.deepEqual(extract('a[type=text, a=b], .a, .b, #c #d'),['a[type=text, a=b]', '.a', '.b', '#c #d']);
  assert.deepEqual(extract('a:not(.a,.b,.c)'),['a:not(.a,.b,.c)']);
  assert.deepEqual(extract('a:not(.a,.b,.c), .b'),['a:not(.a,.b,.c)', '.b']);
  assert.deepEqual(extract('a:not(.a,.b,[type=text]), .b'),['a:not(.a,.b,[type=text])', '.b']);
  assert.deepEqual(extract('a:not(.a,.b,[type=text, a=b]), .b'),['a:not(.a,.b,[type=text, a=b])', '.b']);
});

it('selector specificity comparison', function() {
  var compare = utils.compare;

  assert.deepEqual(compare([0, 1, 2, 3], [0, 2, 0, 0]),[0, 2, 0, 0]);
  assert.deepEqual(compare([0, 2, 0, 0], [0, 1, 2, 3]),[0, 2, 0, 0]);

  // Check that the second reference is returned upon draws
  var b = [0, 1, 1, 4];
  assert.deepEqual(compare([0, 1, 1, 4], b),b);

  assert.deepEqual(compare([0, 0, 0, 4], [0, 0, 0, 10]),[0, 0, 0, 10]);
  assert.deepEqual(compare([0, 0, 0, 10], [0, 0, 0, 4]),[0, 0, 0, 10]);

  assert.deepEqual(compare([0, 4, 0, 0], [0, 0, 100, 4]),[0, 4, 0, 0]);
  assert.deepEqual(compare([0, 0, 100, 4], [0, 4, 0, 0]),[0, 4, 0, 0]);

  assert.deepEqual(compare([0, 1, 1, 5], [0, 1, 1, 15]),[0, 1, 1, 15]);
  assert.deepEqual(compare([0, 1, 1, 15], [0, 1, 1, 5]),[0, 1, 1, 15]);
});

it('selector specificity calculator', function() {
  function spec(selector) {
    return new Selector(selector).specificity();
  }

  assert.deepEqual(spec('#test'),[0, 1, 0, 0]);
  assert.deepEqual(spec('#a #b #c'),[0, 3, 0, 0]);
  assert.deepEqual(spec('.a .b .c'),[0, 0, 3, 0]);
  assert.deepEqual(spec('div.a div.b div.c'),[0, 0, 3, 3]);
  assert.deepEqual(spec('div a span'),[0, 0, 0, 3]);
  assert.deepEqual(spec('#test input[type=text]'),[0, 1, 1, 1]);
  assert.deepEqual(spec('[type=text]'), [0, 0, 1, 0]);
  assert.deepEqual(spec('*'),[0, 0, 0, 0]);
  assert.deepEqual(spec('div *'),[0, 0, 0, 1]);
  assert.deepEqual(spec('div.a.b'),[0, 0, 2, 1]);
  assert.deepEqual(spec('div:not(.a):not(.b)'),[0, 0, 2, 1]);

  assert.deepEqual(spec('div.a'),[0, 0, 1, 1]);
  assert.deepEqual(spec('.a:first-child'),[0, 0, 1, 1]);
  assert.deepEqual(spec('div:not(.c)'),[0, 0, 1, 1]);

});

it('property comparison based on selector specificity', function() {
  function prop(k, v, sel) {
    return new Property(k, v, new Selector(sel));
  }

  var a = prop('color', 'white', '#woot');
  var b = prop('color', 'red', '#a #woot');

  assert.deepEqual(a.compare(b),b);

  a = prop('background-color', 'red', '#a');
  b = prop('background-color', 'red', '.a.b.c');

  assert.deepEqual(a.compare(b),a);

  a = prop('background-color', 'red', '#a .b.c');
  b = prop('background-color', 'red', '.a.b.c #c');

  assert.deepEqual(a.compare(b),b);
});

it('property toString', function() {
  var a = new Property('color', 'white', new Selector('#woot'));

  assert.equal(a.toString(), 'color: white;');
});

it('parse simple css into a object structure', function() {
  var parse = utils.parseCSS;

  var actual = parse('a, b { c: e; }');

  var a = actual[0];
  var b = actual[1];

  assert.equal(a[0],'a');
  assert.deepEqual(a[1]['0'],{ type: 'property', name: 'c', value: 'e', position: { start: { line: 1, col: 8 }, end: { line: 1, col: 12 } }});
  assert.equal(a[1].length,1);
  assert.deepEqual(a[1],b[1]);
});

it('parse complex css into a object structure', function() {
  var parse = utils.parseCSS;

  var actual = parse(['a, b { c: e; }', 'b.e #d { d: e; }','c[a=b] { d: e; }'].join('\n'));
  var a = actual[0];
  var b = actual[1];
  var bed = actual[2];
  var cab = actual[3];

  /*
  delete bed[1].parentRule;
  delete cab[1].parentRule;
  delete bed[1].__starts;
  delete cab[1].__starts;
  */

  assert.deepEqual(a[1],b[1]);
  assert.equal(bed[1].name,cab[1].name);
  assert.equal(bed[1].value,cab[1].value);
});

it('test excludedProperties setting', function() {
  juice.excludedProperties = ['-webkit-font-smoothing'];
  assert.deepEqual(
    juice(
      '<div a="b">woot</div>',
      {extraCss: 'div { color: blue; -webkit-font-smoothing: antialiased; }'}
    ),
    '<div a="b" style="color: blue;">woot</div>'
  );
  // Reset global setting
  juice.excludedProperties = [];
});

it('test juice', function() {
  assert.deepEqual(
    juice('<div a="b">woot</div>', {extraCss: 'div { color: red; }'}),
      '<div a="b" style="color: red;">woot</div>');
});

it('test consecutive important rules', function() {
  assert.deepEqual(
    juice.inlineContent('<p><a>woot</a></p>', 'p a {color: red !important;} a {color: black !important;}'),
      '<p><a style="color: red;">woot</a></p>');
});

it('test * specificity', function() {
  assert.deepEqual(
      juice.inlineContent('<div class="a"></div><div class="b"></div>',
          '* { margin: 0; padding: 0; } .b { margin: 0 !important; } .a { padding: 20px; }'),
      '<div class="a" style="margin: 0; padding: 20px;"></div><div class="b" style="padding: 0; margin: 0;"></div>');
});

it('test style attributes priority', function() {
  assert.deepEqual(
      juice.inlineContent('<div style="color: red;"></div>', 'div { color: black; }'),
      '<div style="color: red;"></div>');
});

it('test style attributes and important priority', function() {
  assert.deepEqual(
      juice.inlineContent('<div style="color: red;"></div>', 'div { color: black !important; }'),
      '<div style="color: black;"></div>');
});

it('test style attributes and important priority', function() {
  assert.deepEqual(
      juice.inlineContent('<div style="color: red !important;"></div>', 'div { color: black !important; }'),
      '<div style="color: red;"></div>');
});

it('test that preserved text order is stable', function() {
  assert.deepEqual(
      utils.getPreservedText('div { color: red; } @media (min-width: 320px) { div { color: green; } } @media (max-width: 640px) { div { color: blue; } }', { mediaQueries: true }, juice.ignoredPseudos).replace(/\s+/g, ' '),
      ' @media (min-width: 320px) { div { color: green; } } @media (max-width: 640px) { div { color: blue; } } ');
});

it('can handle style attributes with html entities', function () {
  // Throws without decodeStyleAttributes: true
  assert.throws(function () {
    juice(
      '<style type="text/css">div {color: red;}</style><div style="font-family:&quot;Open Sans&quot;, sans-serif;"></div>'
    );
  });

  // Expected results with decodeStyleAttributes: true
  assert.deepEqual(
    juice(
      '<style type="text/css">div {color: red;}</style><div style="font-family:&quot;Open Sans&quot;, sans-serif;"></div>',
      { decodeStyleAttributes: true }
    ),
    "<div style=\"color: red; font-family: 'Open Sans', sans-serif;\"></div>"
  );
});

it('`inlineDuplicateProperties` option', function() {
  // Same selector with duplicate properties
  assert.deepEqual(
    juice.inlineContent('<div class="test"></div>', '.test { background-color: black; background-color: rgba(0,0,0,0.5); }'),
    '<div class="test" style="background-color: black; background-color: rgba(0,0,0,0.5);"></div>'
  );

  // Different selectors - without `inlineDuplicateProperties`, only highest specificity is kept
  assert.deepEqual(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: blue; }'),
    '<div class="test" style="background-color: blue;"></div>'
  );

  // Different selectors - with `inlineDuplicateProperties`, all are preserved in specificity order
  assert.deepEqual(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: blue; }', { inlineDuplicateProperties: true }),
    '<div class="test" style="background-color: red; background-color: blue;"></div>'
  );

  // Multiple selectors with multiple properties each - complex case
  assert.deepEqual(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: black; background-color: rgba(0,0,0,0.5); }', { inlineDuplicateProperties: true }),
    '<div class="test" style="background-color: red; background-color: black; background-color: rgba(0,0,0,0.5);"></div>'
  );

  // Multiple classes on same element - without `inlineDuplicateProperties`, only last wins
  assert.deepEqual(
    juice.inlineContent('<div class="bg-black bg-black-50"></div>', '.bg-black { background-color: black; } .bg-black-50 { background-color: rgba(0,0,0,0.5); }'),
    '<div class="bg-black bg-black-50" style="background-color: rgba(0,0,0,0.5);"></div>'
  );

  // Multiple classes on same element - with `inlineDuplicateProperties`, both are preserved
  assert.deepEqual(
    juice.inlineContent('<div class="bg-black bg-black-50"></div>', '.bg-black { background-color: black; } .bg-black-50 { background-color: rgba(0,0,0,0.5); }', { inlineDuplicateProperties: true }),
    '<div class="bg-black bg-black-50" style="background-color: black; background-color: rgba(0,0,0,0.5);"></div>'
  );

  // HTML email use case - solid color fallback for rgba
  assert.deepEqual(
    juice.inlineContent('<div class="header"></div>', '.header { background-color: #000; background-color: rgba(0,0,0,0.8); }', { inlineDuplicateProperties: true }),
    '<div class="header" style="background-color: #000; background-color: rgba(0,0,0,0.8);"></div>'
  );
});

it('`removeInlinedSelectors` option', function() {
  // Basic test - inlined selectors should be removed, media queries preserved
  var result = juice(
    '<style>div { color: red; } .test { background: blue; } @media (max-width: 600px) { div { color: green; } }</style><div class="test">Hello</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="color: red; background: blue;"') > -1, 'styles should be inlined');
  assert.ok(result.indexOf('<style>') > -1, 'style tag should be preserved');
  assert.ok(result.indexOf('@media') > -1, 'media query should be preserved');
  assert.ok(result.indexOf('div {') === -1 || result.indexOf('@media') < result.indexOf('div {'), 'standalone div rule should be removed');
  assert.ok(result.indexOf('.test {') === -1, '.test rule should be removed');

  // Multiple selectors - all inlined selectors should be removed
  result = juice(
    '<style>div { color: red; } p { color: blue; } span { color: green; }</style><div>A</div><p>B</p>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="color: red;"') > -1, 'div styles should be inlined');
  assert.ok(result.indexOf('style="color: blue;"') > -1, 'p styles should be inlined');
  assert.ok(result.indexOf('span {') > -1, 'non-matched span rule should be preserved');

  // Preserve @font-face
  result = juice(
    '<style>@font-face { font-family: "MyFont"; } div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preserveFontFaces: true }
  );
  assert.ok(result.indexOf('@font-face') > -1, 'font-face should be preserved');
  assert.ok(result.indexOf('div {') === -1, 'inlined div rule should be removed');

  // Preserve keyframes
  result = juice(
    '<style>@keyframes slide { from { left: 0; } } div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preserveKeyFrames: true }
  );
  assert.ok(result.indexOf('@keyframes') > -1, 'keyframes should be preserved');
  assert.ok(result.indexOf('div {') === -1, 'inlined div rule should be removed');

  // Preserve pseudos like :hover
  result = juice(
    '<style>div { color: red; } div:hover { color: blue; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preservePseudos: true }
  );
  assert.ok(result.indexOf('style="color: red;"') > -1, 'div styles should be inlined');
  assert.ok(result.indexOf(':hover') > -1, 'hover pseudo should be preserved');

  // When all rules are inlined, style tag should be removed
  result = juice(
    '<style>div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('<style>') === -1, 'empty style tag should be removed');

  // Partial selector match - if selector has multiple comma-separated selectors and only some match
  result = juice(
    '<style>div, p, span { color: red; }</style><div>A</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="color: red;"') > -1, 'matched selector should be inlined');
  // The remaining selectors (p, span) should still be in the style tag
  assert.ok(result.indexOf('<style>') > -1, 'style tag should remain');
  assert.ok(result.indexOf('p') > -1 || result.indexOf('span') > -1, 'unmatched selectors should remain');

  // Works with extraCss option
  result = juice(
    '<div class="test">Hello</div>',
    { 
      extraCss: 'div { color: red; } .test { background: blue; } @media print { div { color: black; } }',
      removeStyleTags: false,
      removeInlinedSelectors: true
    }
  );
  assert.ok(result.indexOf('style="color: red; background: blue;"') > -1, 'styles should be inlined');
  
  // removeStyleTags processes independently - removes non-preserved rules, keeps preserved ones
  result = juice(
    '<style>div { color: red; } @media print { div { color: black; } }</style><div>Test</div>',
    { removeStyleTags: true, removeInlinedSelectors: true }
  );
  // removeInlinedSelectors shouldn't apply when removeStyleTags is true
  assert.ok(result.indexOf('@media print') > -1, 'media query should be preserved with removeStyleTags');

  // Email client targeting selectors
  // Make sure we don't remove CSS selectors that aren't in the original HTML
  result = juice(
    '<style>div { color: red; } u + .body .gmail-fix { display: block; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="color: red;"') > -1, 'div styles should be inlined');
  assert.ok(result.indexOf('u + .body') > -1, 'Gmail targeting selector should be preserved (no match in HTML)');
  assert.ok(result.indexOf('div {') === -1, 'inlined div rule should be removed');

  // Multiple email client targeting selectors
  result = juice(
    '<style>p { margin: 0; } u + .body .gmail { color: red; } #outlook a { padding: 0; } .ExternalClass { width: 100%; }</style><p>Test</p>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="margin: 0;"') > -1, 'p styles should be inlined');
  assert.ok(result.indexOf('u + .body') > -1, 'Gmail selector should be preserved');
  assert.ok(result.indexOf('#outlook') > -1, 'Outlook selector should be preserved');
  assert.ok(result.indexOf('.ExternalClass') > -1, 'Outlook.com selector should be preserved');
  assert.ok(result.indexOf('p {') === -1, 'inlined p rule should be removed');

  // Outlook.com (webmail) class prefix targeting
  result = juice(
    '<style>.header { background: blue; } [class~="x_header"] { max-width: 600px; }</style><div class="header">Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  assert.ok(result.indexOf('style="background: blue;"') > -1, 'header styles should be inlined');
  assert.ok(result.indexOf('[class~="x_header"]') > -1, 'Outlook.com x_ prefix selector should be preserved');
  assert.ok(result.indexOf('.header {') === -1, 'inlined header rule should be removed');
});
