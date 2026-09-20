import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    /* Named explicitly, so a stray copy of a file elsewhere in the tree is never collected */
    include: ['tests/**/*.test.js'],
    /* Each file starts its own in-memory MongoDB, which two files cannot share in one process */
    fileParallelism: false,
    /* The very first run downloads the MongoDB binary, and that outlasts a normal hook timeout */
    hookTimeout: 120000,
    testTimeout: 20000,
  },
});
