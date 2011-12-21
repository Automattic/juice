
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
  , should = require('should')

/**
 * Tests.
 */

module.exports = {

  'test extracting selectors': function () {
    var extract = utils.extract;

    extract('#a').should.eql(['#a']);
    extract('#a, .b').should.eql(['#a', '.b']);
    extract('#a, .b,').should.eql(['#a', '.b']);
    extract('.test.a, #a.b').should.eql(['.test.a', '#a.b']);
    extract('a[type=text, a=b], .a, .b, #c #d').should
      .eql(['a[type=text, a=b]', '.a', '.b', '#c #d']);
    extract('a:not(.a,.b,.c)').should.eql(['a:not(.a,.b,.c)']);
    extract('a:not(.a,.b,.c), .b').should.eql(['a:not(.a,.b,.c)', '.b']);
    extract('a:not(.a,.b,[type=text]), .b').should
      .eql(['a:not(.a,.b,[type=text])', '.b']);
    extract('a:not(.a,.b,[type=text, a=b]), .b').should
      .eql(['a:not(.a,.b,[type=text, a=b])', '.b']);
  },

  'test selector specificity comparison': function () {
    var compare = utils.compare;

    compare([0, 1, 2, 3], [0, 2, 0, 0]).should.eql([0, 2, 0, 0]);
    compare([0, 2, 0, 0], [0, 1, 2, 3]).should.eql([0, 2, 0, 0]);

    // check that the second reference is returned upon draws
    var b = [0, 1, 1, 4];
    compare([0, 1, 1, 4], b).should.equal(b);

    compare([0, 0, 0, 4], [0, 0, 0, 10]).should.eql([0, 0, 0, 10]);
    compare([0, 0, 0, 10], [0, 0, 0, 4]).should.eql([0, 0, 0, 10]);

    compare([0, 4, 0, 0], [0, 0, 100, 4]).should.eql([0, 4, 0, 0]);
    compare([0, 0, 100, 4], [0, 4, 0, 0]).should.eql([0, 4, 0, 0]);

    compare([0, 1, 1, 5], [0, 1, 1, 15]).should.eql([0, 1, 1, 15]);
    compare([0, 1, 1, 15], [0, 1, 1, 5]).should.eql([0, 1, 1, 15]);
  },

  'test selector specificity calculator': function () {
    function spec (selector) {
      return new Selector(selector).specificity();
    };

    spec('#test').should.eql([0, 1, 0, 0]);
    spec('#a #b #c').should.eql([0, 3, 0, 0]);
    spec('.a .b .c').should.eql([0, 0, 3, 0]);
    spec('div.a div.b div.c').should.eql([0, 0, 3, 3]);
    spec('div a span').should.eql([0, 0, 0, 3]);
    spec('#test input[type=text]').should.eql([0, 1, 1, 1]);
    spec('[type=text]', [0, 0, 1, 0]);
    spec('*').should.eql([0, 0, 0, 0]);
    spec('div *').should.eql([0, 0, 0, 1]);
  },

  'test property comparison based on selector specificity': function () {
    function prop (k, v, sel) {
      return new Property(k, v, new Selector(sel));
    }

    var a = prop('color', 'white', '#woot')
      , b = prop('color', 'red', '#a #woot')

    a.compare(b).should.equal(b);

    var a = prop('background-color', 'red', '#a')
      , b = prop('background-color', 'red', '.a.b.c')

    a.compare(b).should.equal(a);

    var a = prop('background-color', 'red', '#a .b.c')
      , b = prop('background-color', 'red', '.a.b.c #c')

    a.compare(b).should.equal(b);
  },

  'test parsing css into a object structure': function () {
    var parse = utils.parseCSS;

    parse('a, b { c: e; }').should.eql([
        ['a', { '0': 'c', length: 1, _importants: { c: '' }, __starts: 5, c: 'e' } ]
      , ['b', { '0': 'c', length: 1, _importants: { c: '' }, __starts: 5, c: 'e' } ]
    ]);

    parse([
        'a, b { c: e; }'
      , 'b.e #d { d: e; }'
      , 'c[a=b] { d: e; }'
    ].join('\n')).should.eql([
        ['a', { '0': 'c', length: 1, _importants: { c: '' }, __starts: 5, c: 'e' } ]
      , ['b', { '0': 'c', length: 1, _importants: { c: '' }, __starts: 5, c: 'e' } ]
      , ['b.e #d', { '0': 'd', length: 1, _importants: { d: '' }, __starts: 22, d: 'e' }]
      , ['c[a=b]', { '0': 'd', length: 1, _importants: { d: '' }, __starts: 39, d: 'e' }]
    ]);
  },

  'test juice': function () {
    juice('<div a="b">woot</div>', 'div { color: red; }')
      .should.equal('<div a="b" style="color: red;">woot</div>');
  }

};
