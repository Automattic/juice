# 7.0.0 / 2019-11-27

* Breaking: requires node 10+
* Please see changes in web-resource-inliner@6 for other details

# 6.0.0 / 2019-11-27

* Drop support for Node.js 4

# 5.2.0 / 2019-03-18

* Fix bug with `getPreservedText` (mixed up `preservePseudos` and `ignorePseudos`)

# 5.1.0 / 2018-12-18

* Add `codeBlocks` support in CLI `--options-file`

# 5.0.0 / 2018-10-02

* Fix gradient CSS being inlined into the `background` attribute

# 5.0.0 / 2018-10-02

* Adds `preservePseudos` option with default `true`
* Adds `th` to list of elements that can receive a `width` attribute

# 4.3.0 / 2018-06-01

* Adds `preserveKeyFrames` option

# 4.2.3 / 2018-03-08

* fix help typo
* fix memory leak in cheerio code block encode/decode
* update TS definition to allow for optional fileContent option

# 4.2.2 / 2017-10-22

* Fix code blocks encode/decode so cheerio doesn't mulch them if they are tag attributes

# 4.2.1 / 2017-10-20

* Fix regex catastrophic backtracking issue with unclosed code blocks

# 4.2.0 / 2017-10-05

* Adds support for `preserveImportant` to CLI

# 4.0.1 / 2016-11-24

* Updated typescript definitions

# 4.0.0 / 2016-11-17

* deps: update web-resource-inliner and cross-spawn
* engine: specify support as node 4.2+
* feat: add option `codeBlocks` to support general exclusion of fenced code, like EJS, HBS, etc.

# 3.0.1 / 2016-10-06

* deps: install mensch from npm instead of github

# 3.0.0 / 2016-06-01

* deps: upgrade web-resource-inliner, change cross-spawn-async to cross-spawn, move batch to devDeps

# 2.0.0 / 2016-05-24

* fix: specificity bugs
* deps: upgrade cheerio, cssom, web-resource-inliner
* major: most options default to `true` instead of `false` now
* major: remove deprecated `toArray`

# 1.11.0 / 2016-05-11

* feat: exclude css properties from inliner with juiceClient.excludedProperties
* fix: specificity of consecutive !important rules

# 1.10.0 / 2016-02-25

* cli: correctly handle absolute path for `optionsFile`
* cli: convert all numbers and booleans from default string values
* Replace deprecated dep `win-spawn` with `cross-spawn-async`

# 1.9.0 / 2016-01-04

* Add option `insertPreservedExtraCss`

# 1.8.1 / 2015-12-01

* Switch xtend to deep-extend to fix issue loading webResources settings when using --options-file

# 1.8.0 / 2015-11-23

* Make all options available through CLI
* Add `--options-file` to CLI for loading JSON options
* Make CLI tests work on Windows
* Deprecate `utils.toArray()`
* Fix handling of `:not()` specificity

# 1.7.0 / 2015-11-03

* Refactor to provide browser support at `juice/client`
* Add option `applyHeightAttributes`
* Bump dep `web-resource-inliner`

# 1.6.0 / 2015-10-26

* Add feature `data-embed` attribute
* update deps: web-resource-inliner, batch, commander, slick

# 1.5.0 / 2015-09-25

* Exclude non-visual tags from inlining
* Add option `preserveFontFaces`
* update dep: web-resource-inliner

# 1.4.0 / 2015-08-19

* Add extra CSS option to CLI
* CLI has test coverage now

# 1.3.3 / 2015-07-14

* Prevent mangling of EJS tags

# 1.3.0 / 2015-07-02

* Add option `preserveImportant`
* Make lib `use_strict` compliant and lint files

# 1.2.0 / 2015-05-21

* Add `xmlMode` option

# 1.1.2 / 2015-05-08

* remove index.js and point `main` in package.json to `/lib/juice.js`

# 1.1.1

* publish with line endings fixed in /bin

# 1.1.0 / 2015-05-04

 * Fix order of inlined style properties. Now sorted by selector specificity, resulting in the same computed styles that the original CSS would have had.
 * Add option to inline pseudo elements as <span> elements

# 1.0.2 / 2015-04-27

* added option `applyAttributesTableElements`
* bump version on web-resource-inliner to 1.1.1
* fix bin/juice so it works as documented

# 1.0.1 / 2015-02-22

* legacy support for `url` option
* bump version on web-resource-inliner to use `relativeTo` with a url and remote paths starting `//`
* update skipped tests to mocha so they will run with `npm test` and on travis
* bump web-resource-inliner version to expose `strict` option, which is now `false` by default

# 1.0.0 / 2015-02-12

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

# 0.5.0 / 2014-09-08

 * update dependencies [binarykitchen]
 * handle errors in loading external css
 * add repository field to readme

# 0.4.0 / 2013-04-15

 * update jsdom dependency to 0.6.0

# 0.3.3 / 2013-04-08

 * fix resolving file:// paths on windows (thanks Mirco Zeiss)
 * fix crash during cleanup. (thanks Ger Hobbelt)
 * update superagent to 0.14.0

# 0.3.2 / 2013-03-26

 * fix regression: not ignoring pseudos

# 0.3.1 / 2013-03-26

 * do not crash on ::selectors (covered by normalize.css test case)

# 0.3.0 / 2013-03-26

 * update jsdom dependency to 0.5.4
 * support node v0.10
 * switch dependency to slick instead of mootools which was rudely unpublished

# 0.2.0 / 2013-02-13

 * update jsdom dependency to 0.5.0

# 0.1.3 / 2013-02-12

 * fix specificity test. all test cases passed now.
 * add a command line `juice` program

# 0.1.2 / 2013-02-11

 * fix incorrectly lowercasing <link> href

# 0.1.1 / 2013-02-11

 * explicitly document which node versions are supported
   with `engines` and travis-ci.
 * expose `juice.inlineDocument` and `juice.inlineContent`

# 0.1.0 / 2013-02-07

 * fix / test case for @media queries
 * merge [boost](https://github.com/superjoe30/boost) into juice
 * legacy `juice` function still works as is
 * add `juice(filePath, [options], callback)`
 * add `juice.juiceDocument(document, options, callback)`
 * add `juice.juiceContent(html, options, callback)`
 * remove `juice.juiceDom`

# 0.0.9 / 2013-02-07

 * update jsdom dependency to 0.4.0
 * update cssom dependency to 0.2.5

# 0.0.8 / 2013-02-06

  * expose a lower level export so you can operate on a jsdom document [superjoe30]
  * fix exports not working [superjoe30]
  * fix jshint problems [superjoe30]

# 0.0.7 / 2013-02-06

  * fixed test case expected outputs to have starting and ending <html> and <body> tags as jsdom appends them in its html() function if they do not exist
  * regression test for previous fix for media queries. note i had to wrap my test .out content in <html><body> tags in order to pass tests, it looks like they are appended at some point for partial html content which just guessing is new behavior from when these tests were written
  * make sure the css rule has selectorText to prevent parsing exception. hit this on @media rules which do not have selector text. afaik this means media queries will not be inlined. however everything else is.
  * bump jsdom
  * Added note regarding node-email-templates to README

# 0.0.6 / 2011-12-20

  * Corrected juice unit tests for latest cssom.
  * Fixed presence of \n in selectors.
  * Fixed unneeded removal of inline event handlers in html.
  * Bumped jsdom.

# 0.0.5 / 2011-10-10

  * Added whitelist of pseudos to ignore (fixes `:first-child` etc)
  * Fine-tuned jsdom for speed (disabled unneded features).
  * Added caching of parsed selectors.

# 0.0.4 / 2011-10-10

  * Fixed `:hover`.

# 0.0.3 / 2011-10-09

  * Fixed specificity :not recursion.

# 0.0.2 / 2011-10-09

  * Fixed specificity calculation for `not()` and pseudos. [arian]

# 0.0.1 / 2011-10-09

  * Initial release.
