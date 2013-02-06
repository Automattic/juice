
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
