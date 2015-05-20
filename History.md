1.1.3 / 2015-05-20
==================

* added options to the command line

1.1.2 / 2015-05-08
==================

* remove index.js and point `main` in package.json to `/lib/juice.js`

1.1.1
==================

* publish with line endings fixed in /bin

1.1.0 / 2015-05-04
==================

 * Fix order of inlined style properties. Now sorted by selector specificity, resulting in the same computed styles that the original CSS would have had.
 * Add option to inline pseudo elements as <span> elements

1.0.2 / 2015-04-27
==================

* added option `applyAttributesTableElements`
* bump version on web-resource-inliner to 1.1.1
* fix bin/juice so it works as documented

1.0.1 / 2015-02-22
==================

* legacy support for `url` option
* bump version on web-resource-inliner to use `relativeTo` with a url and remote paths starting `//`
* update skipped tests to mocha so they will run with `npm test` and on travis
* bump web-resource-inliner version to expose `strict` option, which is now `false` by default

1.0.0 / 2015-02-12
==================

 * add support for node 0.12
 * drop support for node 0.8
 * use cheerio instead of jsdom
 * move remote resource fetching to external library web-resource-inliner
 * adjust public methods as needed to support other changes
 * rename `juiceContent` to `juiceResources`
 * maintain CSS single quotes
 * ability to inline css pixel widths to `width` attribute with `applyWidthAttributes`
 * alphabetize styles for improved specificity
 * ability to keep media query styles with option `preserveMediaQueries`
 * clean up testing setup, including removing old dependency on expresso
 * istanbul put in place to show test coverage
 * remove now unused options `applyLinkTags` and `removeLinkTags`

0.5.0 / 2014-09-08
==================

 * update dependencies [binarykitchen]
 * handle errors in loading external css
 * add repository field to readme

0.4.0 / 2013-04-15
==================

 * update jsdom dependency to 0.6.0

0.3.3 / 2013-04-08
==================

 * fix resolving file:// paths on windows (thanks Mirco Zeiss)
 * fix crash during cleanup. (thanks Ger Hobbelt)
 * update superagent to 0.14.0

0.3.2 / 2013-03-26
==================

 * fix regression: not ignoring pseudos

0.3.1 / 2013-03-26
==================

 * do not crash on ::selectors (covered by normalize.css test case)

0.3.0 / 2013-03-26
==================

 * update jsdom dependency to 0.5.4
 * support node v0.10
 * switch dependency to slick instead of mootools which was rudely unpublished

0.2.0 / 2013-02-13
==================

 * update jsdom dependency to 0.5.0

0.1.3 / 2013-02-12
==================

 * fix specificity test. all test cases passed now.
 * add a command line `juice` program

0.1.2 / 2013-02-11
==================

 * fix incorrectly lowercasing <link> href

0.1.1 / 2013-02-11
==================

 * explicitly document which node versions are supported
   with `engines` and travis-ci.
 * expose `juice.inlineDocument` and `juice.inlineContent`

0.1.0 / 2013-02-07
==================

 * fix / test case for @media queries
 * merge [boost](https://github.com/superjoe30/boost) into juice
 * legacy `juice` function still works as is
 * add `juice(filePath, [options], callback)`
 * add `juice.juiceDocument(document, options, callback)`
 * add `juice.juiceContent(html, options, callback)`
 * remove `juice.juiceDom`

0.0.9 / 2013-02-07
==================

 * update jsdom dependency to 0.4.0
 * update cssom dependency to 0.2.5

0.0.8 / 2013-02-06
==================

  * expose a lower level export so you can operate on a jsdom document [superjoe30]
  * fix exports not working [superjoe30]
  * fix jshint problems [superjoe30]

0.0.7 / 2013-02-06
==================

  * fixed test case expected outputs to have starting and ending <html> and <body> tags as jsdom appends them in its html() function if they do not exist
  * regression test for previous fix for media queries. note i had to wrap my test .out content in <html><body> tags in order to pass tests, it looks like they are appended at some point for partial html content which just guessing is new behavior from when these tests were written
  * make sure the css rule has selectorText to prevent parsing exception. hit this on @media rules which do not have selector text. afaik this means media queries will not be inlined. however everything else is.
  * bump jsdom
  * Added note regarding node-email-templates to README

0.0.6 / 2011-12-20
==================

  * Corrected juice unit tests for latest cssom.
  * Fixed presence of \n in selectors.
  * Fixed unneeded removal of inline event handlers in html.
  * Bumped jsdom.

0.0.5 / 2011-10-10
==================

  * Added whitelist of pseudos to ignore (fixes `:first-child` etc)
  * Fine-tuned jsdom for speed (disabled unneded features).
  * Added caching of parsed selectors.

0.0.4 / 2011-10-10
==================

  * Fixed `:hover`.

0.0.3 / 2011-10-09
==================

  * Fixed specificity :not recursion.

0.0.2 / 2011-10-09
==================

  * Fixed specificity calculation for `not()` and pseudos. [arian]

0.0.1 / 2011-10-09
==================

  * Initial release.
