
/*!
 * Juice unit tests.
 */

/**
 * Test dependencies.
 */

var juice = require('../')
  , Selector = juice.Selector
  , Property = juice.Property
  , utils = juice.utils
  , assert = require('assert');

/**
 * Tests.
 */

it('extracting selectors', function () {
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
} );

it('selector specificity comparison', function () {
    var compare = utils.compare;

    assert.deepEqual(compare([0, 1, 2, 3], [0, 2, 0, 0]),[0, 2, 0, 0]);
    assert.deepEqual(compare([0, 2, 0, 0], [0, 1, 2, 3]),[0, 2, 0, 0]);

    // check that the second reference is returned upon draws
    var b = [0, 1, 1, 4];
    assert.deepEqual(compare([0, 1, 1, 4], b),b);

    assert.deepEqual(compare([0, 0, 0, 4], [0, 0, 0, 10]),[0, 0, 0, 10]);
    assert.deepEqual(compare([0, 0, 0, 10], [0, 0, 0, 4]),[0, 0, 0, 10]);

    assert.deepEqual(compare([0, 4, 0, 0], [0, 0, 100, 4]),[0, 4, 0, 0]);
    assert.deepEqual(compare([0, 0, 100, 4], [0, 4, 0, 0]),[0, 4, 0, 0]);

    assert.deepEqual(compare([0, 1, 1, 5], [0, 1, 1, 15]),[0, 1, 1, 15]);
    assert.deepEqual(compare([0, 1, 1, 15], [0, 1, 1, 5]),[0, 1, 1, 15]);
} );

it('selector specificity calculator', function () {
    function spec (selector) {
      return new Selector(selector).specificity();
    };

    assert.deepEqual(spec('#test'),[0, 1, 0, 0]);
    assert.deepEqual(spec('#a #b #c'),[0, 3, 0, 0]);
    assert.deepEqual(spec('.a .b .c'),[0, 0, 3, 0]);
    assert.deepEqual(spec('div.a div.b div.c'),[0, 0, 3, 3]);
    assert.deepEqual(spec('div a span'),[0, 0, 0, 3]);
    assert.deepEqual(spec('#test input[type=text]'),[0, 1, 1, 1]);
    assert.deepEqual(spec('[type=text]'), [0, 0, 1, 0]);
    assert.deepEqual(spec('*'),[0, 0, 0, 0]);
    assert.deepEqual(spec('div *'),[0, 0, 0, 1]);
} );

it('property comparison based on selector specificity', function () {
    function prop (k, v, sel) {
      return new Property(k, v, new Selector(sel));
    }

    var a = prop('color', 'white', '#woot')
      , b = prop('color', 'red', '#a #woot')

    assert.deepEqual(a.compare(b),b);

    var a = prop('background-color', 'red', '#a')
      , b = prop('background-color', 'red', '.a.b.c')

    assert.deepEqual(a.compare(b),a);

    var a = prop('background-color', 'red', '#a .b.c')
      , b = prop('background-color', 'red', '.a.b.c #c')

    assert.deepEqual(a.compare(b),b);
} );

it('parse simple css into a object structure', function () {
    var parse = utils.parseCSS;

    var actual = parse('a, b { c: e; }');
    var a = actual[0];
    var b = actual[1];

    assert.equal(a[0],'a');
    assert.equal(a[1]['0'],'c');
    assert.equal(a[1].length,1);
    assert.deepEqual(a[1]._importants, { c: '' });
    assert.equal(a[1].c,'e');
    assert.deepEqual(a[1],b[1]);
} );

it('parse complex css into a object structure', function () {
    var parse = utils.parseCSS;

    var actual = parse(['a, b { c: e; }', 'b.e #d { d: e; }', 'c[a=b] { d: e; }'].join('\n'));
    var a = actual[0];
    var b = actual[1];
    var bed = actual[2];
    var cab = actual[3];

    delete bed[1].parentRule;
    delete cab[1].parentRule;
    delete bed[1].__starts;
    delete cab[1].__starts;

    assert.deepEqual(a[1],b[1]);
    assert.deepEqual(bed[1],cab[1]);
} );

it('test juice', function () {
    assert.deepEqual(juice('<div a="b">woot</div>', {extraCss: 'div { color: red; }'}),
        '<div a="b" style="color: red;">woot</div>');
} );