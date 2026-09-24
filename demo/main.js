import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import juice from '../client.js';
import { version } from '../package.json';
import example from './example.html?raw';

const defaultExtraCss = `@media (max-width: 480px) {
  .footer { font-size: 11px !important; }
}
`;

const options = [
  { name: 'applyStyleTags', value: true, description: 'Inline styles from <style> tags.' },
  { name: 'removeStyleTags', value: true, description: 'Remove the original <style> tags after inlining their CSS.' },
  { name: 'removeInlinedSelectors', value: false, description: 'Remove only the rules that were inlined from <style> tags. Works only when removeStyleTags is off.' },
  { name: 'preserveMediaQueries', value: true, description: 'Keep @media rules in a <style> tag when removeStyleTags is on.' },
  { name: 'preserveContainerQueries', value: true, description: 'Keep @container rules in a <style> tag when removeStyleTags is on.' },
  { name: 'preserveLayers', value: true, description: 'Keep @layer rules in a <style> tag when removeStyleTags is on.' },
  { name: 'preserveFontFaces', value: true, description: 'Keep @font-face rules in a <style> tag when removeStyleTags is on.' },
  { name: 'preserveKeyFrames', value: true, description: 'Keep @keyframes rules in a <style> tag when removeStyleTags is on.' },
  { name: 'preservePseudos', value: true, description: 'Keep rules with pseudo selectors like :hover in a <style> tag when removeStyleTags is on.' },
  { name: 'preserveImportant', value: false, description: 'Keep !important in inlined values.' },
  { name: 'insertPreservedExtraCss', value: true, description: 'Insert preserved @media and @font-face rules from Extra CSS into the document.' },
  { name: 'applyWidthAttributes', value: true, description: 'Add width attributes from CSS pixel widths on table, td, th and img.' },
  { name: 'applyHeightAttributes', value: true, description: 'Add height attributes from CSS pixel heights on table, td, th and img.' },
  { name: 'applyAttributesTableElements', value: true, description: 'Add attributes like bgcolor and align on table elements, from their CSS equivalents.' },
  { name: 'resolveCSSVariables', value: true, description: 'Replace var() references with their values.' },
  { name: 'inlineDuplicateProperties', value: false, description: 'Inline every declaration of a property instead of only the winning one. Useful for progressive enhancement.' },
  { name: 'inlinePseudoElements', value: false, description: 'Insert ::before and ::after content as <span> elements.' },
  { name: 'decodeStyleAttributes', value: false, description: 'Decode HTML entities in style attribute values.' },
  { name: 'xmlMode', value: false, description: 'Output XML/XHTML with all tags closed. The input must be valid XML.' },
];

const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
  langs: [import('@shikijs/langs/html'), import('@shikijs/langs/css')],
  engine: createJavaScriptRegexEngine(),
});

const highlight = (code, lang) => highlighter.codeToHtml(code, {
  lang,
  themes: { light: 'github-light', dark: 'github-dark' },
});

/**
 * Editable code: the textarea sits on top with transparent text, and the
 * highlighted copy underneath follows its content and scroll position.
 */
const createEditor = (textarea, lang) => {
  const code = textarea.previousElementSibling;
  const syncScroll = () => {
    code.scrollTop = textarea.scrollTop;
    code.scrollLeft = textarea.scrollLeft;
  };
  const update = () => {
    // A trailing newline has no height in <pre>, so pad it to keep the last line aligned.
    const value = textarea.value.endsWith('\n') ? `${textarea.value} ` : textarea.value;
    code.innerHTML = highlight(value, lang);
    syncScroll();
  };
  textarea.addEventListener('input', update);
  textarea.addEventListener('scroll', syncScroll);
  return update;
};

const $ = (id) => document.getElementById(id);
const input = $('input');
const extraCss = $('extra-css');
const output = $('output');
const preview = $('preview');
const error = $('error');
const optionsList = $('options');
const tabs = { html: $('tab-html'), preview: $('tab-preview') };

const updateInput = createEditor(input, 'html');
const updateExtraCss = createEditor(extraCss, 'css');
let outputHtml = '';

$('version').textContent = `v${version}`;
input.value = example;
extraCss.value = defaultExtraCss;
updateInput();
updateExtraCss();

for (const option of options) {
  const item = document.createElement('li');
  item.innerHTML = `
    <label>
      <input type="checkbox">
      <span><code></code><small></small></span>
    </label>
  `;
  const checkbox = item.querySelector('input');
  checkbox.name = option.name;
  checkbox.checked = option.value;
  item.querySelector('code').textContent = option.name;
  item.querySelector('small').textContent = option.description;
  optionsList.append(item);
}

const readOptions = () => {
  const result = { extraCss: extraCss.value };
  for (const checkbox of optionsList.querySelectorAll('input')) {
    result[checkbox.name] = checkbox.checked;
  }
  return result;
};

const render = () => {
  try {
    const html = juice(input.value, readOptions());
    outputHtml = html;
    output.innerHTML = highlight(html, 'html');
    preview.srcdoc = html;
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }
};

let timer;
const scheduleRender = () => {
  clearTimeout(timer);
  timer = setTimeout(render, 150);
};

const showTab = (name) => {
  const isPreview = name === 'preview';
  tabs.html.setAttribute('aria-selected', String(!isPreview));
  tabs.preview.setAttribute('aria-selected', String(isPreview));
  output.hidden = isPreview;
  preview.hidden = !isPreview;
};

input.addEventListener('input', scheduleRender);
extraCss.addEventListener('input', scheduleRender);
optionsList.addEventListener('change', render);
tabs.html.addEventListener('click', () => showTab('html'));
tabs.preview.addEventListener('click', () => showTab('preview'));

$('reset').addEventListener('click', () => {
  input.value = example;
  extraCss.value = defaultExtraCss;
  updateInput();
  updateExtraCss();
  render();
});

$('copy').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  await navigator.clipboard.writeText(outputHtml);
  button.textContent = 'Copied';
  setTimeout(() => { button.textContent = 'Copy'; }, 1500);
});

render();
