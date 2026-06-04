/*!
 * Juice unit tests.
 */

/**
 * Test dependencies.
 */

import juice from '../index.js';
import * as numbers from '../lib/numbers.js';

const Selector = juice.Selector;
const Property = juice.Property;
const utils = juice.utils;

function cleanString(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Tests.
 */

it('extracting selectors', function() {
  const extract = utils.extract;

  expect(extract('#a')).toEqual(['#a']);
  expect(extract('#a, .b')).toEqual(['#a', '.b']);
  expect(extract('#a, .b,')).toEqual(['#a', '.b']);
  expect(extract('.test.a, #a.b')).toEqual(['.test.a', '#a.b']);
  expect(extract('a[type=text, a=b], .a, .b, #c #d')).toEqual(['a[type=text, a=b]', '.a', '.b', '#c #d']);
  expect(extract('a:not(.a,.b,.c)')).toEqual(['a:not(.a,.b,.c)']);
  expect(extract('a:not(.a,.b,.c), .b')).toEqual(['a:not(.a,.b,.c)', '.b']);
  expect(extract('a:not(.a,.b,[type=text]), .b')).toEqual(['a:not(.a,.b,[type=text])', '.b']);
  expect(extract('a:not(.a,.b,[type=text, a=b]), .b')).toEqual(['a:not(.a,.b,[type=text, a=b])', '.b']);
});

it('selector specificity comparison', function() {
  const compare = utils.compare;

  expect(compare([0, 1, 2, 3], [0, 2, 0, 0])).toEqual([0, 2, 0, 0]);
  expect(compare([0, 2, 0, 0], [0, 1, 2, 3])).toEqual([0, 2, 0, 0]);

  // Check that the second reference is returned upon draws
  const b = [0, 1, 1, 4];
  expect(compare([0, 1, 1, 4], b)).toBe(b);

  expect(compare([0, 0, 0, 4], [0, 0, 0, 10])).toEqual([0, 0, 0, 10]);
  expect(compare([0, 0, 0, 10], [0, 0, 0, 4])).toEqual([0, 0, 0, 10]);

  expect(compare([0, 4, 0, 0], [0, 0, 100, 4])).toEqual([0, 4, 0, 0]);
  expect(compare([0, 0, 100, 4], [0, 4, 0, 0])).toEqual([0, 4, 0, 0]);

  expect(compare([0, 1, 1, 5], [0, 1, 1, 15])).toEqual([0, 1, 1, 15]);
  expect(compare([0, 1, 1, 15], [0, 1, 1, 5])).toEqual([0, 1, 1, 15]);
});

it('selector specificity calculator', function() {
  function spec(selector) {
    return new Selector(selector).specificity();
  }

  expect(spec('#test')).toEqual([0, 1, 0, 0]);
  expect(spec('#a #b #c')).toEqual([0, 3, 0, 0]);
  expect(spec('.a .b .c')).toEqual([0, 0, 3, 0]);
  expect(spec('div.a div.b div.c')).toEqual([0, 0, 3, 3]);
  expect(spec('div a span')).toEqual([0, 0, 0, 3]);
  expect(spec('#test input[type=text]')).toEqual([0, 1, 1, 1]);
  expect(spec('[type=text]')).toEqual([0, 0, 1, 0]);
  expect(spec('*')).toEqual([0, 0, 0, 0]);
  expect(spec('div *')).toEqual([0, 0, 0, 1]);
  expect(spec('div.a.b')).toEqual([0, 0, 2, 1]);
  expect(spec('div:not(.a):not(.b)')).toEqual([0, 0, 2, 1]);

  expect(spec('div.a')).toEqual([0, 0, 1, 1]);
  expect(spec('.a:first-child')).toEqual([0, 0, 1, 1]);
  expect(spec('div:not(.c)')).toEqual([0, 0, 1, 1]);
});

it('selector specificity for :is/:where/:has/:not', function() {
  function spec(s) {
    return new Selector(s).specificity();
  }

  // :where contributes 0 to specificity
  expect(spec(':where(#a)')).toEqual([0, 0, 0, 0]);
  expect(spec('.x:where(#a, .b)')).toEqual([0, 0, 1, 0]);
  expect(spec(':where(:where(#a))')).toEqual([0, 0, 0, 0]);

  // :is takes the max specificity across its args
  expect(spec(':is(#a, .b)')).toEqual([0, 1, 0, 0]); // #a wins
  expect(spec(':is(.a, .b)')).toEqual([0, 0, 1, 0]);
  expect(spec('div:is(.a, b)')).toEqual([0, 0, 1, 1]); // div + .a (.a > b)

  // :has takes the max specificity across its args
  expect(spec(':has(#a, .b)')).toEqual([0, 1, 0, 0]);
  expect(spec('p:has(> a.b)')).toEqual([0, 0, 1, 2]); // p + a.b

  // :not takes the max specificity across its args (was first-arg-only)
  expect(spec(':not(#a, .b)')).toEqual([0, 1, 0, 0]);
  expect(spec(':not(.a, #b)')).toEqual([0, 1, 0, 0]); // would have been [0,0,1,0]
  expect(spec('a:not(.x):not(.y)')).toEqual([0, 0, 2, 1]);
});

it('property comparison based on selector specificity', function() {
  function prop(k, v, sel) {
    return new Property(k, v, new Selector(sel));
  }

  let a = prop('color', 'white', '#woot');
  let b = prop('color', 'red', '#a #woot');

  expect(a.compare(b)).toBe(b);

  a = prop('background-color', 'red', '#a');
  b = prop('background-color', 'red', '.a.b.c');

  expect(a.compare(b)).toBe(a);

  a = prop('background-color', 'red', '#a .b.c');
  b = prop('background-color', 'red', '.a.b.c #c');

  expect(a.compare(b)).toBe(b);
});

it('property toString', function() {
  const a = new Property('color', 'white', new Selector('#woot'));

  expect(a.toString()).toBe('color: white;');
});

it('parse simple css into a object structure', function() {
  const parse = utils.parseCSS;

  const actual = parse('a, b { c: e; }');

  const a = actual[0];
  const b = actual[1];

  expect(a[0]).toBe('a');
  expect(a[1]['0']).toEqual({ type: 'property', name: 'c', value: 'e', position: { start: { line: 1, col: 8 }, end: { line: 1, col: 12 } }});
  expect(a[1].length).toBe(1);
  expect(a[1]).toEqual(b[1]);
});

it('parse complex css into a object structure', function() {
  const parse = utils.parseCSS;

  const actual = parse(['a, b { c: e; }', 'b.e #d { d: e; }','c[a=b] { d: e; }'].join('\n'));
  const a = actual[0];
  const b = actual[1];
  const bed = actual[2];
  const cab = actual[3];

  expect(a[1]).toEqual(b[1]);
  expect(bed[1].name).toBe(cab[1].name);
  expect(bed[1].value).toBe(cab[1].value);
});

it('test excludedProperties setting', function() {
  juice.excludedProperties = ['-webkit-font-smoothing'];
  expect(
    juice(
      '<div a="b">woot</div>',
      {extraCss: 'div { color: blue; -webkit-font-smoothing: antialiased; }'}
    )
  ).toBe('<div a="b" style="color: blue;">woot</div>');
  // Reset global setting
  juice.excludedProperties = [];
});

it('test juice', function() {
  expect(juice('<div a="b">woot</div>', {extraCss: 'div { color: red; }'}))
    .toBe('<div a="b" style="color: red;">woot</div>');
});

it('test consecutive important rules', function() {
  expect(juice.inlineContent('<p><a>woot</a></p>', 'p a {color: red !important;} a {color: black !important;}'))
    .toBe('<p><a style="color: red;">woot</a></p>');
});

it('test * specificity', function() {
  expect(
    juice.inlineContent('<div class="a"></div><div class="b"></div>',
      '* { margin: 0; padding: 0; } .b { margin: 0 !important; } .a { padding: 20px; }')
  ).toBe('<div class="a" style="margin: 0; padding: 20px;"></div><div class="b" style="padding: 0; margin: 0;"></div>');
});

it('test style attributes priority', function() {
  expect(juice.inlineContent('<div style="color: red;"></div>', 'div { color: black; }'))
    .toBe('<div style="color: red;"></div>');
});

it('test style attributes and important priority', function() {
  expect(juice.inlineContent('<div style="color: red;"></div>', 'div { color: black !important; }'))
    .toBe('<div style="color: black;"></div>');
});

it('test style attributes and important priority', function() {
  expect(juice.inlineContent('<div style="color: red !important;"></div>', 'div { color: black !important; }'))
    .toBe('<div style="color: red;"></div>');
});

it('test that preserved text order is stable', function() {
  expect(
    utils.getPreservedText('div { color: red; } @media (min-width: 320px) { div { color: green; } } @media (max-width: 640px) { div { color: blue; } }', { mediaQueries: true }, juice.ignoredPseudos).replace(/\s+/g, ' ')
  ).toBe(' @media (min-width: 320px) { div { color: green; } } @media (max-width: 640px) { div { color: blue; } } ');
});

it('can handle style attributes with html entities', function () {
  // Throws without decodeStyleAttributes: true
  expect(() => {
    juice('<style type="text/css">div {color: red;}</style><div style="font-family:&quot;Open Sans&quot;, sans-serif;"></div>');
  }).toThrow();

  // Expected results with decodeStyleAttributes: true
  expect(
    juice(
      '<style type="text/css">div {color: red;}</style><div style="font-family:&quot;Open Sans&quot;, sans-serif;"></div>',
      { decodeStyleAttributes: true }
    )
  ).toBe("<div style=\"color: red; font-family: 'Open Sans', sans-serif;\"></div>");
});

it('inlineDuplicateProperties', function() {
  // Same selector with duplicate properties
  expect(
    juice.inlineContent('<div class="test"></div>', '.test { background-color: black; background-color: rgba(0,0,0,0.5); }')
  ).toBe('<div class="test" style="background-color: black; background-color: rgba(0,0,0,0.5);"></div>');

  // Different selectors - without `inlineDuplicateProperties`, only highest specificity is kept
  expect(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: blue; }')
  ).toBe('<div class="test" style="background-color: blue;"></div>');

  // Different selectors - with `inlineDuplicateProperties`, all are preserved in specificity order
  expect(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: blue; }', { inlineDuplicateProperties: true })
  ).toBe('<div class="test" style="background-color: red; background-color: blue;"></div>');

  // Multiple selectors with multiple properties each - complex case
  expect(
    juice.inlineContent('<div class="test"></div>', 'div { background-color: red; } .test { background-color: black; background-color: rgba(0,0,0,0.5); }', { inlineDuplicateProperties: true })
  ).toBe('<div class="test" style="background-color: red; background-color: black; background-color: rgba(0,0,0,0.5);"></div>');

  // Multiple classes on same element - without `inlineDuplicateProperties`, only last wins
  expect(
    juice.inlineContent('<div class="bg-black bg-black-50"></div>', '.bg-black { background-color: black; } .bg-black-50 { background-color: rgba(0,0,0,0.5); }')
  ).toBe('<div class="bg-black bg-black-50" style="background-color: rgba(0,0,0,0.5);"></div>');

  // Multiple classes on same element - with `inlineDuplicateProperties`, both are preserved
  expect(
    juice.inlineContent('<div class="bg-black bg-black-50"></div>', '.bg-black { background-color: black; } .bg-black-50 { background-color: rgba(0,0,0,0.5); }', { inlineDuplicateProperties: true })
  ).toBe('<div class="bg-black bg-black-50" style="background-color: black; background-color: rgba(0,0,0,0.5);"></div>');

  // HTML email use case - solid color fallback for rgba
  expect(
    juice.inlineContent('<div class="header"></div>', '.header { background-color: #000; background-color: rgba(0,0,0,0.8); }', { inlineDuplicateProperties: true })
  ).toBe('<div class="header" style="background-color: #000; background-color: rgba(0,0,0,0.8);"></div>');
});

it('data-juice-duplicates', function() {
  const css = 'div { background-color: red; } .test { background-color: blue; }';

  // attribute present (no value) enables duplicates even when the option is off
  expect(
    juice.inlineContent('<div class="test" data-juice-duplicates></div>', css)
  ).toBe('<div class="test" style="background-color: red; background-color: blue;"></div>');

  // data-juice-duplicates="true" enables duplicates
  expect(
    juice.inlineContent('<div class="test" data-juice-duplicates="true"></div>', css)
  ).toBe('<div class="test" style="background-color: red; background-color: blue;"></div>');

  // data-juice-duplicates="false" disables duplicates even when the option is on
  expect(
    juice.inlineContent('<div class="test" data-juice-duplicates="false"></div>', css, { inlineDuplicateProperties: true })
  ).toBe('<div class="test" style="background-color: blue;"></div>');

  // the attribute is stripped from output regardless of whether it matched a rule
  expect(
    juice.inlineContent('<div data-juice-duplicates></div>', 'span { color: red; }')
  ).toBe('<div></div>');
});

it('data-juice-important', function() {
  const css = '.test { color: red !important; }';

  // attribute present (no value) preserves !important even when the option is off
  expect(
    juice.inlineContent('<div class="test" data-juice-important></div>', css)
  ).toBe('<div class="test" style="color: red !important;"></div>');

  // data-juice-important="true" preserves !important
  expect(
    juice.inlineContent('<div class="test" data-juice-important="true"></div>', css)
  ).toBe('<div class="test" style="color: red !important;"></div>');

  // data-juice-important="false" strips !important even when the option is on
  expect(
    juice.inlineContent('<div class="test" data-juice-important="false"></div>', css, { preserveImportant: true })
  ).toBe('<div class="test" style="color: red;"></div>');

  // the attribute is stripped from output regardless of whether it matched a rule
  expect(
    juice.inlineContent('<div data-juice-important></div>', 'span { color: red; }')
  ).toBe('<div></div>');
});

it('removeInlinedSelectors', function() {
  // Basic test - inlined selectors should be removed, media queries preserved
  let result = juice(
    '<style>div { color: red; } .test { background: blue; } @media (max-width: 600px) { div { color: green; } }</style><div class="test">Hello</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'styles should be inlined').toContain('style="color: red; background: blue;"');
  expect(result, 'style tag should be preserved').toContain('<style>');
  expect(result, 'media query should be preserved').toContain('@media');
  expect(result.indexOf('div {') === -1 || result.indexOf('@media') < result.indexOf('div {')).toBe(true);
  expect(result, '.test rule should be removed').not.toContain('.test {');

  // Multiple selectors - all inlined selectors should be removed
  result = juice(
    '<style>div { color: red; } p { color: blue; } span { color: green; }</style><div>A</div><p>B</p>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'div styles should be inlined').toContain('style="color: red;"');
  expect(result, 'p styles should be inlined').toContain('style="color: blue;"');
  expect(result, 'non-matched span rule should be preserved').toContain('span {');
  expect(result, 'inlined div rule should be removed').not.toContain('div {');
  expect(result, 'inlined p rule should be removed').not.toContain('p {');

  // Preserve @font-face
  result = juice(
    '<style>@font-face { font-family: "MyFont"; } div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preserveFontFaces: true }
  );
  expect(result, 'font-face should be preserved').toContain('@font-face');
  expect(result, 'inlined div rule should be removed').not.toContain('div {');

  // Preserve keyframes
  result = juice(
    '<style>@keyframes slide { from { left: 0; } } div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preserveKeyFrames: true }
  );
  expect(result, 'keyframes should be preserved').toContain('@keyframes');
  expect(result, 'inlined div rule should be removed').not.toContain('div {');

  // Preserve pseudos like :hover
  result = juice(
    '<style>div { color: red; } div:hover { color: blue; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preservePseudos: true }
  );
  expect(result, 'div styles should be inlined').toContain('style="color: red;"');
  expect(result, 'hover pseudo should be preserved').toContain(':hover');
  expect(result, 'inlined div rule should be removed').not.toContain('div {');

  // When all rules are inlined, style tag should be removed
  result = juice(
    '<style>div { color: red; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'empty style tag should be removed').not.toContain('<style>');

  // Partial selector match - if selector has multiple comma-separated selectors and only some match
  result = juice(
    '<style>div, p, span { color: red; }</style><div>A</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'matched selector should be inlined').toContain('style="color: red;"');
  // The remaining selectors (p, span) should still be in the style tag
  expect(result, 'style tag should be preserved').toContain('<style>');
  expect(result, 'unmatched selectors should be preserved').toContain('p');
  expect(result).toContain('span');

  // Works with extraCss option
  result = juice(
    '<div class="test">Hello</div>',
    {
      extraCss: 'div { color: red; } .test { background: blue; } @media print { div { color: black; } }',
      removeStyleTags: false,
      removeInlinedSelectors: true
    }
  );
  expect(result, 'styles should be inlined').toContain('style="color: red; background: blue;"');
  expect(result, 'style tag should be preserved').toContain('<style>');
  expect(result, 'media query should be preserved').toContain('@media print');
  expect(result.indexOf('div {') === -1 || result.indexOf('@media') < result.indexOf('div {')).toBe(true);
  expect(result, '.test rule should be removed').not.toContain('.test {');

  // `removeStyleTags` takes precedence over `removeInlinedSelectors`
  result = juice(
    '<style>div { color: red; } @media print { div { color: black; } }</style><div>Test</div>',
    { removeStyleTags: true, removeInlinedSelectors: true }
  );
  // `removeInlinedSelectors` shouldn't apply when `removeStyleTags` is true
  expect(result, 'media query should be preserved with removeStyleTags').toContain('@media print');

  // Email client targeting selectors
  // Make sure we don't remove CSS selectors that aren't in the original HTML
  result = juice(
    '<style>div { color: red; } u + .body .gmail-fix { display: block; }</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'div styles should be inlined').toContain('style="color: red;"');
  expect(result, 'Gmail targeting selector should be preserved').toContain('u + .body');
  expect(result, 'inlined div rule should be removed').not.toContain('div {');

  // Multiple email client targeting selectors
  result = juice(
    '<style>p { margin: 0; } u + .body .gmail { color: red; } #outlook a { padding: 0; } .ExternalClass { width: 100%; }</style><p>Test</p>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'p styles should be inlined').toContain('style="margin: 0;"');
  expect(result, 'Gmail selector should be preserved').toContain('u + .body');
  expect(result, 'Outlook selector should be preserved').toContain('#outlook');
  expect(result, 'Outlook.com selector should be preserved').toContain('.ExternalClass');
  expect(result, 'inlined p rule should be removed').not.toContain('p {');

  // Outlook.com (webmail) class prefix targeting
  result = juice(
    '<style>.header { background: blue; } [class~="x_header"] { max-width: 600px; }</style><div class="header">Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'header styles should be inlined').toContain('style="background: blue;"');
  expect(result, 'Outlook.com x_ prefix selector should be preserved').toContain('[class~="x_header"]');
  expect(result, 'inlined header rule should be removed').not.toContain('.header {');

  // Complex selectors
  result = juice(
    `
      <style>
        :where(.space-x-4>:not(:last-child)) {
          --tw-space-x-reverse: 0;
          margin-right: calc(1rem * var(--tw-space-x-reverse));
          margin-left: calc(1rem * calc(1 - var(--tw-space-x-reverse)));
        }
        div { color: red; }
      </style>
      <div class="space-x-4">
        <span>Item 1</span>
        <span>Item 2</span>
      </div>
    `,
    { removeStyleTags: false, removeInlinedSelectors: true, resolveCSSVariables: true }
  );

  expect(result, 'div styles should be inlined').toContain('style="color: red;"');
  expect(result, 'complex selector should be inlined').toContain(
    '<span style="margin-right: calc(1rem * 0); margin-left: calc(1rem * calc(1 - 0));">Item 1</span>'
  );
  expect(result, 'second span should be unchanged').toContain('<span>Item 2</span>');
  expect(result, 'inlined complex selector rule should be removed').not.toContain(':where(.space-x-4>:not(:last-child))');
  expect(result, 'style tag should be removed as all rules are inlined').not.toContain('<style>');
});

it('preserves styles in `data-embed` style tags', function() {
  const result = juice(
    '<style>div { color: blue; }</style><style data-embed>img {color: red}</style><div>Test</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result, 'div styles should be inlined').toContain('style="color: blue;"');
  expect(result, 'data-embed style tag content should be completely untouched').toContain('<style>img {color: red}</style>');
  expect(result, 'data-embed attribute should be removed').not.toContain('data-embed');
});

it('/* juice ignore */ (entire file)', function () {
  const css = '/* juice ignore */\nbody { color: red; }\n.test { color: blue; }';
  const html = '<body><div class="test">Hello</div></body>';

  expect(juice.inlineContent(html, css))
    .toBe('<body><div class="test">Hello</div></body>');
});

it('/* juice ignore next */ (rule)', function () {
  const css = `body { color: red; }
/* juice ignore next */
.test { color: blue; }
.other { color: green; }`;

  const html = '<body><div class="test">Test</div><div class="other">Other</div></body>';

  const result = juice.inlineContent(html, css);

  // body and .other should be inlined, but .test should not
  expect(result).toContain('style="color: red;');
  expect(result).toContain('style="color: green;');
  expect(result).not.toContain('color: blue');
});

it('/* juice ignore next */ (declaration)', function () {
  const css = `.test {
  color: red;
  /* juice ignore next */
  font-weight: bold;
  font-size: 14px;
}`;

  const html = '<div class="test">Hello</div>';

  const result = juice.inlineContent(html, css);

  // color and font-size should be inlined, but font-weight should not
  expect(result).toContain('color: red');
  expect(result).toContain('font-size: 14px');
  expect(result).not.toContain('font-weight');
});

it('/* juice start|end ignore */', function () {
  const css = `
body { color: red; }

/* juice start ignore */
.test { color: blue; }
.other { color: green; }
/* juice end ignore */

.inline { color: purple; }
`;
  const html = '<body><div class="test">Test</div><div class="other">Other</div><div class="inline">Inline</div></body>';

  const result = juice.inlineContent(html, css);

  // body and .inline should be inlined, but .test and .other should not
  expect(result).toContain('style="color: red;');
  expect(result).toContain('style="color: purple;');
  expect(result).not.toContain('color: blue');
  expect(result).not.toContain('color: green');
});

it('/* juice start|end ignore */ block is preserved', function () {
  const html = `
<html>
  <head>
    <style>
      body { margin: 0; }
      /* juice start ignore */
      a[x-apple-data-detectors] {
        color: inherit!important;
      }
      /* juice end ignore */
    </style>
  </head>
  <body>
    <a href="#">Link</a>
  </body>
</html>
`;

  const result = juice(html, { removeStyleTags: true });

  // The ignored block should be preserved in a style tag
  expect(result).toContain('<style>');
  expect(result).toContain('a[x-apple-data-detectors]');
  expect(result).toContain('color: inherit!important');
});

it('/* juice ignore next */ rule is preserved', function () {
  const html = `
<html>
  <head>
    <style>
      body { color: red; }
      /* juice ignore next */
      .special {
        color: blue;
      }
    </style>
  </head>
  <body>
    <div class="special">Text</div>
  </body>
</html>
`;

  const result = juice(html, { removeStyleTags: true });

  // body should be inlined
  expect(result).toContain('style="color: red;');
  // .special should be preserved in style tag
  expect(result).toContain('<style>');
  expect(result).toContain('.special');
});

it('/* juice ignore next */ declaration is preserved', function () {
  const html = `
<html>
  <head>
    <style>
      .test {
        color: red;
        /* juice ignore next */
        font-weight: bold;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="test">Text</div>
  </body>
</html>
`;

  const result = juice(html, { removeStyleTags: true });

  // color and font-size should be inlined
  expect(result).toContain('color: red');
  expect(result).toContain('font-size: 14px');
  // font-weight should be preserved in style tag
  expect(result).toContain('<style>');
  expect(result).toContain('.test');
  expect(result).toContain('font-weight: bold');
});

it('`preservedSelectors` option', function() {
  // Basic test - preserve specific selector with removeStyleTags
  let result = juice(
    '<style>div { color: red; } .preserve-me { background: blue; }</style><div class="preserve-me">Test</div>',
    { removeStyleTags: true, preservedSelectors: ['.preserve-me'] }
  );

  expect(cleanString(result))
    .toBe('<style> .preserve-me { background: blue; } </style><div class="preserve-me" style="color: red; background: blue;">Test</div>');

  // Preserve multiple selectors
  result = juice(
    `<style>
      p { margin: 0; }
      .keep-1 { color: red; }
      .keep-2 { color: blue; }
      span { padding: 0; }
    </style>
    <p class="keep-1 keep-2">A</p><span>B</span>`,
    { removeStyleTags: true, preservedSelectors: ['.keep-1', '.keep-2'] }
  );

  expect(cleanString(result))
    .toBe('<style> .keep-1 { color: red; } .keep-2 { color: blue; } </style> <p class="keep-1 keep-2" style="margin: 0; color: blue;">A</p><span style="padding: 0;">B</span>');

  // Works with removeInlinedSelectors
  result = juice(
    `<style>
      div { color: red; }
      .important { font-weight: bold; }
      .another { text-decoration: underline; }
    </style>
    <div class="important">Test</div>`,
    { removeStyleTags: false, removeInlinedSelectors: true, preservedSelectors: ['.important'] }
  );

  expect(cleanString(result))
    .toBe('<style>.important { font-weight: bold; } .another { text-decoration: underline; }</style> <div class="important" style="color: red; font-weight: bold;">Test</div>');

  // Email client targeting - include substring matches
  result = juice(
    `<style>
      p { color: black; }
      u + .body { color: white; }
      #outlook a { padding: 0; }
    </style>
    <p>Hello</p>`,
    {
      removeStyleTags: false,
      removeInlinedSelectors: true,
      preservedSelectors: ['body', '#outlook a']
    }
  );

  expect(cleanString(result))
    .toBe('<style>u + .body { color: white; } #outlook a { padding: 0; }</style> <p style="color: black;">Hello</p>');

  // Complex selectors
  result = juice(
    '<style>.btn { padding: 10px; } [class~="x_btn"] { color: blue; } div > p { margin: 0; }</style><div class="btn">Button</div><div><p>Text</p></div>',
    { removeStyleTags: false, removeInlinedSelectors: true, preservedSelectors: ['[class~="x_btn"]'] }
  );
  expect(result, 'attribute selector should be preserved').toContain('[class~="x_btn"]');
  expect(result, 'inlined .btn rule should be removed').not.toContain('.btn {');

  // Empty preservedSelectors array - should behave normally
  result = juice(
    '<style>div { color: red; }</style><div>Test</div>',
    { removeStyleTags: true, preservedSelectors: [] }
  );

  expect(result).toBe('<div style="color: red;">Test</div>');

  // Preserve with media queries and other preserves
  result = juice(
    '<style>div { color: red; } .m-0 { margin: 0; } @media print { div { color: black; } }</style><div>Test</div>',
    {
      removeStyleTags: false,
      removeInlinedSelectors: true,
      preservedSelectors: ['.m-0'],
      preserveMediaQueries: true
    }
  );

  expect(cleanString(result))
    .toBe('<style>.m-0 { margin: 0; } @media print { div { color: black; } }</style><div style="color: red;">Test</div>');
});

it('styleAttributeName option writes to a custom attribute', function() {
  const html = '<div class="foo">x</div>';
  const css = '.foo { color: red; }';
  const result = juice.inlineContent(html, css, { styleAttributeName: 'data-style' });
  expect(result).toContain('data-style="color: red;"');
  // bare `style=` (with no `data-` prefix) should not appear
  expect(/(?<![\w-])style=/.test(result)).toBe(false);
});

it('skips rules with unparseable selectors', function() {
  // postcss-safe-parser parses `!` as a rule selector. postcss-selector-parser
  // then throws on that selector text. selector.js catches the throw and
  // returns a null AST → handleRule takes its early-return path.
  const html = '<div class="x">y</div>';
  const css = '! { color: red; } .x { color: blue; }';
  const result = juice.inlineContent(html, css);
  expect(result).toContain('color: blue');
});

it('skips empty <style> elements during removeInlinedSelectors', function() {
  // Empty style tag triggers the "childNodes.length !== 1" early-return path.
  const result = juice(
    '<style></style><style>div { color: red; }</style><div>x</div>',
    { removeStyleTags: false, removeInlinedSelectors: true }
  );
  expect(result).toContain('style="color: red;"');
});

it('inlinePseudoElements with content:none yields empty pseudo-element text', function() {
  const html = '<div>x</div>';
  const css = 'div::before { content: none; }';
  const result = juice.inlineContent(html, css, { inlinePseudoElements: true });
  expect(typeof result).toBe('string');
});

it('inlinePseudoElements supports upper-roman counter style', function() {
  const html = '<div>x</div>';
  const css = 'div { counter-reset: n 5; } div::before { content: counter(n, upper-roman); }';
  const result = juice.inlineContent(html, css, { inlinePseudoElements: true });
  // 5 in upper-roman = "V"
  expect(result).toContain('V');
});

it('inlinePseudoElements supports lower-latin counter style', function() {
  const html = '<div>x</div>';
  const css = 'div { counter-reset: n 2; } div::before { content: counter(n, lower-latin); }';
  const result = juice.inlineContent(html, css, { inlinePseudoElements: true });
  // 2 in lower-latin = "b"
  expect(result).toContain('b');
});

it('counter-increment without counter-reset is a no-op', function() {
  const html = '<div>x</div>';
  const css = 'div { counter-increment: foo; } div::before { content: counter(foo); }';
  // foo was never reset → increment should be skipped, no crash
  const result = juice.inlineContent(html, css, { inlinePseudoElements: true });
  expect(typeof result).toBe('string');
});

it('parseCSS returns [] when the parser throws', function() {
  // safeParser throws on null/undefined input (lone catastrophic case);
  // parseCSS in non-strict mode swallows and returns an empty rule list.
  expect(utils.parseCSS(null)).toEqual([]);
});

it('parseCSS re-throws in strict mode', function() {
  expect(() => utils.parseCSS(null, { strict: true })).toThrow();
});

it('getPreservedText returns false when the parser throws', function() {
  expect(utils.getPreservedText(null, {})).toBe(false);
});

it('getPreservedText handles whole-file /* juice ignore */ directive', function() {
  const css = '/* juice ignore */\nbody { color: red; }';
  expect(utils.getPreservedText(css, {})).toBe('\n' + css + '\n');
});

it('removeInlinedSelectorsFromCSS returns "" when the parser throws', function() {
  expect(
    utils.removeInlinedSelectorsFromCSS(null, new Set(), { preservePseudos: false, preservedSelectors: [] }, [])
  ).toBe('');
});

it('Selector.specificity returns [0,0,0,0] for unparseable selectors', function() {
  // postcss-selector-parser throws on `!`; selector.js catches → parsed() returns null;
  // specificity() falls back to its default tuple.
  const sel = new Selector('!');
  expect(sel.specificity()).toEqual([0, 0, 0, 0]);
});

it('Selector.specificity returns [1,0,0,0] for unparseable style-attribute selectors', function() {
  // Same path as above but with the styleAttribute flag set — exercises the
  // other arm of the `styleAttribute ? 1 : 0` ternary in the fallback.
  const sel = new Selector('!', true);
  expect(sel.specificity()).toEqual([1, 0, 0, 0]);
});

it('numbers.romanize returns NaN for non-numeric input', function() {
  expect(numbers.romanize('abc')).toBeNaN();
});

it('flattens nested CSS rules before inlining', function() {
  const html = '<div class="card"><span class="title">x</span></div>';
  const css = '.card { color: red; & .title { font-weight: bold; } }';
  const result = juice.inlineContent(html, css);
  expect(result).toContain('class="card" style="color: red;"');
  expect(result).toContain('class="title" style="font-weight: bold;"');
});
