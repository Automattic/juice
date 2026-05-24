// Type definitions for Juice 12.0.0
// Project: https://github.com/Automattic/juice
// Definitions by: Kamil Nikel <https://github.com/knikel>

declare namespace juice {
  export interface Callback { (err: Error, html: string): any; }

  export interface Options {
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
    preserveContainerQueries?: boolean;
    preserveFontFaces?: boolean;
    preserveImportant?: boolean;
    preserveKeyFrames?: boolean;
    preserveLayers?: boolean;
    preserveMediaQueries?: boolean;
    preservePseudos?: boolean;
    removeInlinedSelectors?: boolean;
    removeStyleTags?: boolean;
    resolveCSSVariables?: boolean;
    webResources?: WebResourcesOptions;
    xmlMode?: boolean;
  }

  export interface WebResourcesOptions {
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

interface Juice {
  (html: string, options?: juice.Options): string;

  juiceResources(html: string, options: juice.Options, callback: juice.Callback): string;
  juiceFile(filePath: string, options: juice.Options, callback: juice.Callback): string;
  juiceDocument($: any, options?: juice.Options): any;
  inlineContent(html: string, css: string, options?: juice.Options): string;
  inlineDocument($: any, css: string, options?: juice.Options): any;

  codeBlocks: { [index: string]: { start: string, end: string } };
  excludedProperties: string[];
  heightElements: HTMLElement[];
  ignoredPseudos: string[];
  nonVisualElements: HTMLElement[];
  styleToAttribute: { [index: string]: string };
  tableElements: HTMLElement[];
  widthElements: HTMLElement[];
}

declare const juice: Juice;

export default juice;
