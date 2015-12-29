"use strict";

var program = require('commander');
var pkg = require('../package');

var cli = {};

module.exports = cli;

cli.getProgram = function () {
    program.name = pkg.name;

    program.version(pkg.version)
      .usage('[options] input.html output.html');

    Object.keys(cli.options).forEach( function (key) {
        program.option('--' + key + ' [value]', cli.options[key].def);
    });

    program.parse(process.argv);

    return program;
};

cli.options = {
    "css": {
        pMap: "css",
        map: "cssFile",
        def: "Add an extra CSS file by name" },
    "options-file": {
        pMap: "optionsFile",
        def: "Load options from a JSON file" },
    "extra-css": {
        pMap: "extraCss",
        def: "Add extra CSS" },
    "insert-preserved-extra-css": {
        pMap: "insertPreservedExtraCss",
        def: "insert preserved @font-face and @media into document?" },
    "apply-style-tags": {
        pMap: "applyStyleTags",
        def: "inline from style tags?" },
    "remove-style-tags": {
        pMap: "removeStyleTags",
        def: "remove style tags?" },
    "preserve-media-queries": {
        pMap: "preserveMediaQueries",
        def: "preserve media queries?" },
    "preserve-font-faces": {
        pMap: "preserveFontFaces",
        def: "preserve media queries?" },
    "apply-width-attributes": {
        pMap: "applyWidthAttributes",
        def: "apply width attributes to relevent elements?" },
    "apply-height-attributes": {
        pMap: "applyHeightAttributes",
        def: "apply width attributes to relevent elements?" },
    "apply-attributes-table-elements": {
        pMap: "applyAttributesTableElements",
        def: "apply attributes with and equivalent CSS value to table elemets?" },
    "web-resources-inline-attribute": {
        pMap: "webResourcesInlineAttribute",
        map: "inlineAttribute",
        def: "see docs for web-resource-inliner inlineAttribute" },
    "web-resources-images": {
        pMap: "webResourcesImages",
        map: "images",
        def: "see docs for web-resource-inliner images" },
    "web-resources-links": {
        pMap: "webResourcesLinks",
        map: "links",
        def: "see docs for web-resource-inliner links" },
    "web-resources-scripts": {
        pMap: "webResourcesScripts",
        map: "scripts",
        def: "see docs for web-resource-inliner scripts" },
    "web-resources-relative-to": {
        pMap: "webResourcesRelativeTo",
        map: "relativeTo",
        def: "see docs for web-resource-inliner relativeTo" },
    "web-resources-rebase-relative-to": {
        pMap: "webResourcesRebaseRelativeTo",
        map: "rebaseRelativeTo",
        def: "see docs for web-resource-inliner rebaseRelativeTo" },
    "web-resources-cssmin": {
        pMap: "webResourcesCssmin",
        map: "cssmin",
        def: "see docs for web-resource-inliner cssmin" },
    "web-resources-uglify": {
        pMap: "webResourcesUglify",
        map: "uglify",
        def: "see docs for web-resource-inliner uglify" },
    "web-resources-strict": {
        pMap: "webResourcesStrict",
        map: "strict",
        def: "see docs for web-resource-inliner strict" }
};

cli.argsToOptions = function (program) {
    var result = { webResources: {} };
    Object.keys(cli.options).forEach(function (key) {
        var option = cli.options[key];
        var value = program[option.pMap];
        if (value !== undefined) {
            if (option.pMap.match(/webResources/)) {
                result.webResources[option.map] = value;
            }
            else {
                result[option.map || option.pMap] = value;
            }
        }
    } );
    return result;
};
