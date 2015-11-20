"use strict";

var cli = {};

module.exports = cli;

cli.options = {
    "css": {
        map: "cssFile",
        def: "Add an extra CSS file by name" },
    "extra-css": {
        map: "extraCss",
        def: "Add extra CSS" },
    "apply-style-tags": {
        map: "applyStyleTags",
        def: "inline from style tags?" },
    "remove-style-tags": {
        map: "removeStyleTags",
        def: "remove style tags?" },
    "preserve-media-queries": {
        map: "preserveMediaQueries",
        def: "preserve media queries?" },
    "preserve-font-faces": {
        map: "preserveFontFaces",
        def: "preserve media queries?" },
    "apply-width-attributes": {
        map: "applyWidthAttributes",
        def: "apply width attributes to relevent elements?" },
    "apply-height-attributes": {
        map: "applyHeightAttributes",
        def: "apply width attributes to relevent elements?" },
    "apply-attributes-table-elements": {
        map: "applyAttributesTableElements",
        def: "apply attributes with and equivalent CSS value to table elemets?" },
    "web-resources-inline-attribute": {
        map: "webResources.inlineAttribute",
        def: "see docs for web-resource-inliner" },
    "web-resources-images": {
        map: "webResources.images",
        def: "see docs for web-resource-inliner" },
    "web-resources-links": {
        map: "webResources.links",
        def: "see docs for web-resource-inliner" },
    "web-resources-scripts": {
        map: "webResources.scripts",
        def: "see docs for web-resource-inliner" },
    "web-resources-relative-to": {
        map: "webResources.relativeTo",
        def: "see docs for web-resource-inliner" },
    "web-resources-rebase-relative-to": {
        map: "webResources.rebaseRelativeTo",
        def: "see docs for web-resource-inliner" },
    "web-resources-cssmin": {
        map: "webResources.cssmin",
        def: "see docs for web-resource-inliner" },
    "web-resources-uglify": {
        map: "webResources.uglify",
        def: "see docs for web-resource-inliner" },
    "web-resources-strict": {
        map: "webResources.strict",
        def: "see docs for web-resource-inliner" }
};

cli.argsToOptions = function (program) {
    var result = { webResources: {} };
    Object.keys(cli.options).forEach(function (key) {
        if(typeof(program[key]) !== "undefined") {
            var option = cli.options[key];
            var value = program[key];
            if(key.match(/web-resources/)) {
                result.webResources[option.map.replace(/webResources\./, "")] = value;
            }
            else {
                result[option.map] = value;
            }
        }
    } );
    return result;
};
