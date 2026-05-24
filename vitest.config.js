'use strict';

import { defineConfig } from 'vitest/config';

export default defineConfig({
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
