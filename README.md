
# Juice

Given HTML and CSS, juice will inline your properties into the `style`
attribute.

## How to use

```js
juice('<p>Test</p>', 'p { color: red; }')
// '<p style="color: red;">Test</p>'
```
