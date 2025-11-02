// Type definitions for Juice 3.0.0
// Project: https://github.com/Automattic/juice
// Definitions by: Kamil Nikel <https://github.com/knikel>

/* =================== USAGE ===================
   import juice = require('juice');
   =============================================== */

export = juice;

declare function juice(html: string, options?: juice.Options): string;

declare namespace juice {

  export function juiceResources(html: string, options: Options, callback: Callback): string

  export function juiceFile(filePath: string, options: Options, callback: Callback): string

  export function juiceDocument($: any, options?: Options): any

  export function inlineContent(html: string, css: string, options?: Options): string

  export function inlineDocument($: any, css: string, options?: Options): any

  export let codeBlocks: { [index: string]: { start: string, end: string } };
  export let excludedProperties: string[];
  export let heightElements: HTMLElement[];
  export let ignoredPseudos: string[];
  export let nonVisualElements: HTMLElement[];
  export let styleToAttribute: { [index: string]: string };
  export let tableElements: HTMLElement[];
  export let widthElements: HTMLElement[];

  export interface Callback { (err: Error, html: string): any; }

  interface Options {
    applyAttributesTableElements?: boolean;
    applyHeightAttributes?: boolean;
    applyStyleTags?: boolean;
    applyWidthAttributes?: boolean;
    decodeStyleAttributes?: boolean;
    extraCss?: string;
    inlineDuplicateProperties?: boolean;
    inlinePseudoElements?: boolean;
    insertPreservedExtraCss?: boolean;
    preservedSelectors?: string[];
    preserveFontFaces?: boolean;
    preserveImportant?: boolean;
    preserveKeyFrames?: boolean;
    preserveMediaQueries?: boolean;
    preservePseudos?: boolean;
    removeInlinedSelectors?: boolean;
    removeStyleTags?: boolean;
    resolveCSSVariables?: boolean;
    webResources?: WebResourcesOptions;
    xmlMode?: boolean;
  }

  interface WebResourcesOptions {
    fileContent?: string;
    images?: boolean | number;
    inlineAttribute?: string;
    links?: boolean | number;
    rebaseRelativeTo?: string;
    relativeTo?: string;
    scripts?: boolean | number;
    strict?: boolean;
    svgs?: boolean | number;
  }
}
