// This file should be updated when `cheerio` has type definitions

/// <reference path="./cheerio.d.ts" />

import juice = require('../../');
import cheerio = require('cheerio');

const sample = '<style>div{class: red;}</style><div></div>';
const someHtml = '<h1 class="x">yo</h1>';
const someCss = '.x{font-size: 20em;}';
const noOptions = {};
const mostOptions = {
  extraCss: someCss,
  applyStyleTags: true,
  removeStyleTags: true,
  preserveMediaQueries: true,
  preserveFontFaces: true,
  preserveKeyFrames: true,
  insertPreservedExtraCss: true,
  applyWidthAttributes: true,
  applyHeightAttributes: true,
  applyAttributesTableElements: true,
  inlinePseudoElements: true,
  xmlMode: true,
  preserveImportant: true,
};
const minWebResourceOptions = {
  webResources: {},
};
const someWebResourceOptions = {
  webResources: {
    images: false,
  },
};
const allWebResourceOptions = {
  webResources: {
    fileContent: '<link href="css/style.css" rel="stylesheet" inlineme>',
    inlineAttribute: 'inlineme',
    images: true,
    svgs: true,
    scripts: true,
    links: true,
    relativeTo: 'https://github.com/',
    rebaseRelativeTo: 'assets',
    cssmin: true,
    strict: true,
  },
};

const cheerio$ = cheerio.load('<h1>test</h1>');

const x: string = juice(someHtml, {});

juice.juiceResources(
  sample,
  noOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceResources(
  sample,
  mostOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceResources(
  sample,
  minWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceResources(
  sample,
  someWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceResources(
  sample,
  allWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceResources(
  sample,
  { extraCss: 'body{background: red;}' },
  (err: Error, html: string): void => console.log(html)
);

juice.juiceFile(
  'somePath.html',
  noOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceFile(
  'somePath.html',
  mostOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceFile(
  'somePath.html',
  minWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceFile(
  'somePath.html',
  someWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

juice.juiceFile(
  'somePath.html',
  allWebResourceOptions,
  (err: Error, html: string): void => console.log(html)
);

const c1 = juice.juiceDocument(
  cheerio$,
  noOptions
);

const c2 = juice.juiceDocument(
  cheerio$,
  mostOptions
);

const c3 = juice.juiceDocument(
  cheerio$,
  minWebResourceOptions
);

const c4 = juice.juiceDocument(
  cheerio$,
  someWebResourceOptions
);

const c5 = juice.juiceDocument(
  cheerio$,
  allWebResourceOptions
);

const c6 = juice.juiceDocument(
  cheerio$,
);

juice.inlineContent(someHtml, someCss, noOptions);

juice.inlineContent(someHtml, someCss, mostOptions);

juice.inlineContent(someHtml, someCss, minWebResourceOptions);

juice.inlineContent(someHtml, someCss, someWebResourceOptions);

juice.inlineContent(someHtml, someCss, allWebResourceOptions);

juice.inlineDocument(cheerio$, someCss, noOptions);

juice.inlineDocument(cheerio$, someCss, mostOptions);

juice.inlineDocument(cheerio$, someCss, minWebResourceOptions);

juice.inlineDocument(cheerio$, someCss, someWebResourceOptions);

juice.inlineDocument(cheerio$, someCss, allWebResourceOptions);

// Global settings

juice.codeBlocks['HBS'] = { start: '{{', end: '}}' };
juice.ignoredPseudos = ['hover'];
juice.widthElements = [];
juice.heightElements = [];
juice.styleToAttribute = { x: 'y' };
juice.tableElements = [];
juice.nonVisualElements = [];
juice.excludedProperties = [];
