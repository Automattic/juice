# Juice ![](http://i.imgur.com/jN8Ht.gif)

Given HTML and CSS, juice will inline your properties into the `style`
attribute.

## How to use

```js
var juice = require('juice');
juice('<p>Test</p>', 'p { color: red; }')
// '<p style="color: red;">Test</p>'
```

## What is this useful for ?

- HTML emails. For a comprehensive list of supported selectors see
[here](http://www.campaignmonitor.com/css/)
- Embedding HTML in 3rd-party websites.

## Projects using juice

* [node-email-templates][1] - Node.js module for rendering beautiful emails with [ejs][2] templates and email-friendly inline CSS using [juice][3].

[1]: https://github.com/niftylettuce/node-email-templates
[2]: https://github.com/visionmedia/ejs
[3]: https://github.com/LearnBoost/juice

## Credits

(The MIT License)

Copyright (c) 2011 Guillermo Rauch &lt;guillermo@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### 3rd-party

- Uses the excellent [JSDom](http://github.com/tmpvar/jsdom) for the underlying DOM
representation.
- Uses [cssom](https://github.com/NV/CSSOM) to parse out CSS selectors and
[Slick](http://github.com/subtleGradient/slick) to tokenize them.
- Icon by [UnheardSounds](http://unheardsounds.deviantart.com/gallery/26536908#/d2ngozi)
