# Juice ![](https://i.imgur.com/jN8Ht.gif)

[![CI][github-ci-shield]][github-ci]
![Downloads](https://img.shields.io/npm/dw/juice)
[![License][license-shield]][license]

Given HTML, Juice will inline your CSS properties into the `style` attribute.

[Some projects using Juice &rarr;](PROJECTS.md)

## How to use

Juice has a number of functions based on whether you want to process a file, HTML string, or a cheerio document, and whether you want Juice to automatically get remote stylesheets, scripts and image dataURIs to inline.

To inline HTML without getting remote resources, using default options:

```js
const juice = require('juice');
const result = juice("<style>div{color:red;}</style><div/>");
```

`result` will be:
```html
<div style="color: red;"></div>
```

[Try out the web client version](https://automattic.github.io/juice/)

## What is this useful for?

- HTML emails. For CSS support in email clients see [Can I Email](https://www.caniemail.com/).
- Embedding HTML in 3rd-party websites.

## Documentation

Juice is exposed as a standard module, and from CLI with a smaller set of options.

### Options

All Juice methods take an options object that can contain any of these properties, though not every method uses all of these:

| Option | Default&nbsp;value | Description |
|--------|-------|------------|
| `applyAttributesTableElements` | `true` | Create attributes for styles in `juice.styleToAttribute` on elements set in `juice.tableElements`. |
| `applyHeightAttributes` | `true` | Use any CSS pixel heights to create `height` attributes on elements set in `juice.heightElements`. |
| `applyStyleTags` | `true` | Inline styles in `<style>` tags. |
| `applyWidthAttributes` | `true` | Use any CSS pixel widths to create `width` attributes on elements set in `juice.widthElements`. |
| `decodeStyleAttributes` | `false` | Decode the value of `style` attributes. |
| `extraCss` | `""` | Extra CSS to apply to the file. |
| `inlineDuplicateProperties` | `false` | When `true`, declarations with identical CSS properties will all be inlined, instead of only the one with the highest specificity. Useful for progressive enhancement. |
| `insertPreservedExtraCss` | `true` | Whether to insert into the document any preserved `@media` or `@font-face` content from `extraCss` when using `preserveMediaQueries`, `preserveFontFaces` or `preserveKeyFrames`. <br><br> When set to `true`, order of preference to append the `<style>` element is into `head`, then `body`, then at the end of the document. <br><br> When a `string` the value is treated as a CSS/jQuery/cheerio selector, and when found, the `<style>` tag will be appended to the end of the first match. |
| `inlinePseudoElements` | `false` | Insert pseudo elements (`::before` and `::after`) as `<span>` into the DOM. *Note*: Inserting pseudo elements will modify the DOM and may conflict with CSS selectors elsewhere on the page (e.g., `:last-child`). |
| `preserveFontFaces` | `true` | Preserve all `@font-face` within `<style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. |
| `preserveImportant` | `false` | Preserve `!important` in CSS values. |
| `preserveMediaQueries` | `true` | Preserve all media queries (and contained styles) within `<style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. |
| `preserveKeyFrames` | `true` | Preserve all key frames within `<style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. |
| `preservePseudos` | `true` | Preserve all rules containing pseudo selectors defined in `ignoredPseudos` within `<style>` tags as a refinement when `removeStyleTags` is `true`. Other styles are removed. |
| `preservedSelectors` | `[]` | Array of strings that represent CSS selectors to preserve inside `<style>` tags when `removeStyleTags` or `removeInlinedSelectors` are `true`. Matches substrings.
| `removeInlinedSelectors` | `false` | Remove CSS rules from `<style>` tags after (possibly) inlining them. Other rules are preserved. Works only if `removeStyleTags` is `false`. |
| `removeStyleTags` | `true` | Remove the original `<style>` tags after (possibly) inlining their CSS content. Overrides `removeInlinedSelectors`. | 
| `resolveCSSVariables` | `true` | Resolve CSS variables. |
| `webResources` | `{}` | An options object that will be passed to [web-resource-inliner](https://www.npmjs.com/package/web-resource-inliner) for Juice functions that will get remote resources (`juiceResources` and `juiceFile`). |
| `xmlMode` | `false` | Output XML/XHTML with all tags closed. Note that the input *must* also be valid XML/XHTML or you will get undesirable results. |

### Methods

#### juice(html [, options])

Returns a string containing the HTML with inlined CSS. 

Does not fetch remote resources.

 * `html` - HTML string, accepts complete documents as well as fragments
 * `options` - optional, see Options above

#### juice.juiceResources(html, options, callback)

Callback returns a string containing the HTML with inlined CSS. 

Fetches remote resources.

 * `html` - (string) HTML
 * `options` - see Options above
 * `callback(err, html)`
   - `err` - `Error` object or `null`
   - `html` - (string) HTML with inlined CSS

#### juice.juiceFile(filePath, options, callback)

Callback returns a string containing the HTML with inlined CSS. 

Fetches remote resources.

 * `filePath` - path to the HTML file to be Juiced
 * `options` - see Options above
 * `callback(err, html)`
   - `err` - `Error` object or `null`
   - `html` - (string) HTML with inlined CSS

#### juice.juiceDocument($ [, options])

This takes a `cheerio` instance and performs inlining in-place. Returns the same `cheerio` instance. 
Does not fetch remote resources.

 * `$` - a `cheerio` instance, be sure to use the same `cheerio` version that Juice uses
 * `options` - (object) optional, see Options above

#### juice.inlineContent(html, css [, options])

This takes HTML and CSS and returns new HTML with the provided CSS inlined.

It does not look at `<style>` or `<link rel="stylesheet">` elements at all.

 * `html` - HTML string
 * `css` - CSS string
 * `options` - (object) optional, see Options above

#### juice.inlineDocument($, css [, options])

Given a `cheerio` instance and CSS, this modifies the `cheerio` instance so that the provided CSS is inlined. It does not look at `<style>` or `<link rel="stylesheet">` elements at all.

 * `$` - a `cheerio` instance, be sure to use the same `cheerio` version that juice uses
 * `css` - CSS string
 * `options` - (object) optional, see Options above

### Global settings

#### juice.codeBlocks

Type: Object\
Default:

```js
{
  EJS: { start: '<%', end: '%>' },
  HBS: { start: '{{', end: '}}' }
}
```

An object where each value has a `start` and `end` to specify fenced code blocks that should be ignored during parsing and inlining. 

For example, Handlebars (hbs) templates are `juice.codeBlocks.HBS = {start: '{{', end: '}}'}`. `codeBlocks` can fix problems where otherwise juice might interpret code like `<=` as HTML, when it is meant to be template language code. 

Note that `codeBlocks` is a dictionary which can contain many different code blocks, so don't do `juice.codeBlocks = {...}` do `juice.codeBlocks.myBlock = {...}`

#### juice.ignoredPseudos

Type: Array\
Default: `['hover', 'active', 'focus', 'visited', 'link']`

Array of ignored pseudo-selectors such as 'hover' and 'active'.

#### juice.widthElements

Type: Array\
Default: `['TABLE', 'TD', 'TH', 'IMG']`

Array of HTML elements that can receive `width` attributes.

#### juice.heightElements

Type: Array\
Default: `['TABLE', 'TD', 'TH', 'IMG']`

Array of HTML elements that can receive `height` attributes.

#### juice.styleToAttribute

Type: Object\
Default:

```js
{
  'background-color': 'bgcolor',
  'background-image': 'background',
  'text-align': 'align',
  'vertical-align': 'valign'
}
```

Object of style property names (key) to their respective attribute names (value).

#### juice.tableElements

Type: Array\
Default: `['TABLE', 'TH', 'TR', 'TD', 'CAPTION', 'COLGROUP', 'COL', 'THEAD', 'TBODY', 'TFOOT']`

Array of table HTML elements that can receive attributes defined in `juice.styleToAttribute`.

#### juice.nonVisualElements

Type: Array\
Default: `[ 'HEAD', 'TITLE', 'BASE', 'LINK', 'STYLE', 'META', 'SCRIPT', 'NOSCRIPT' ]`

Array of elements that will not have styles inlined because they are not intended to render.

#### juiceClient.excludedProperties

Type: Array\
Default: `[]`

Array of CSS properties that won't be inlined.

### Special markup

#### data-embed

Add `data-embed` to any `<style>` tag to prevent Juice from inlining its CSS and removing it.
Can be used to embed email client support hacks that rely on CSS selectors into your email templates:

```html
<style data-embed>
  u + .body .your-class-name {
    /* CSS here targets Gmail */
  }
</style>
```

The `data-embed` attribute will be removed from the output HTML, but no inlining or style tag removal will take place:

```html
<style>
  u + .body .your-class-name {
    /* CSS here targets Gmail */
  }
</style>
```

### Ignoring CSS with comments

You can use special CSS comments to prevent Juice from inlining entire CSS files, rules, or even just declarations.

#### Ignore entire file

Add a `/* juice ignore */` comment on the first line in your CSS:

```html
<style>
  /* juice ignore */
  body { color: red; }
  .test { color: blue; }
</style>

<body>
  <div class="test">Hello World</div>
</body>
```

The entire CSS will be ignored (as in, not inlined). 

With `removeStyleTags: true`, the whole `<style>` tag will be preserved.

#### Ignore next rule

Add `/* juice ignore next */` before any CSS rule to skip inlining that rule:

```css
body { color: black; }

/* juice ignore next */
h1 {
  color: blue;
}

p { color: green; }
```

The `h1` rule will not be inlined, but will be preserved when `removeStyleTags: true`. The `body` and `p` rules will be inlined normally.

#### Ignore next declaration

Add `/* juice ignore next */` inside a CSS rule to skip inlining the next declaration:

```css
.test {
  color: red;
  /* juice ignore next */
  font-weight: bold;
  font-size: 14px;
}
```

The `color` and `font-size` will be inlined, but `font-weight` will not. The rule with the ignored declaration will be preserved in a `<style>` tag when `removeStyleTags: true`.

#### Ignore blocks of code

Use start/end comment pairs to ignore multiple rules:

```css
h1 {
  color: black;
}

/* juice start ignore */
h2 {
  color: pink;
}

h3 {
  color: lightcoral;
}
/* juice end ignore */

h4 {
  color: green;
}
```

The `h2` and `h3` rules will not be inlined but will be preserved in a `<style>` tag when `removeStyleTags: true`. The `h1` and `h4` rules will be inlined normally.

### CLI Options

To use Juice from CLI, run `juice [options] input.html output.html`

For a listing of all available options, just type `juice -h`.

> Note that if you want to just type `juice` from the command line, you should `npm install juice -g` so it is globally available.

The CLI should have all the above [options](#options) with the names changed from camel case to hyphen-delimited, so for example `extraCss` becomes `extra-css` and `webResources.scripts` becomes `web-resources-scripts`.

These are additional options not included in the standard `juice` options listed above:

- `--css [filepath]` will load and inject CSS into `extraCss`.
- `--options-file [filepath]` will load and inject options from a JSON file. Options from the CLI will be given priority over options in the file when there is a conflict.
- `codeBlocks` is optionally supported in the options file if you include it. This will allow you to support different template languages in a build process.

### Running Juice in the Browser

Attempting to Browserify `require('juice')` fails because portions of Juice and its dependencies interact with the file system using the standard `require('fs')`. However, you can `require('juice/client')` via Browserify which has support for `juiceDocument`, `inlineDocument`, and `inlineContent`, but not `juiceFile`, `juiceResources`, or `inlineExternal`. *Note that automated tests are not running in the browser yet.*

## License

MIT Licensed, see [LICENSE.md](LICENSE.md).

### 3rd-party

- Uses [cheerio](https://github.com/cheeriojs/cheerio) for the underlying DOM representation.
- Uses [mensch](https://github.com/brettstimmerman/mensch) to parse out CSS and
[Slick](https://github.com/subtleGradient/slick) to tokenize them.
- Icon by [UnheardSounds](http://unheardsounds.deviantart.com/gallery/26536908#/d2ngozi)


[github-ci]: https://github.com/Automattic/juice/actions
[github-ci-shield]: https://github.com/Automattic/juice/actions/workflows/nodejs.yml/badge.svg
[license]: ./LICENSE
[license-shield]: https://img.shields.io/npm/l/juice.svg
