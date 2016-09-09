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

it('test [dontInline] attribute', function() {
  assert.deepEqual(
      juice(
          '<style>div[dontInline] { color: blue;}</style><div a="b">woot</div>'
      , {removeStyleTags : false}),
      '<style>div { color: blue;}</style><div a="b">woot</div>'
  );
});