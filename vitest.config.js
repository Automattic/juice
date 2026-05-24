'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['index.js', 'client.js', 'lib/**/*.js'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage'
    }
  }
});
