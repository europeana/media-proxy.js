import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default {
  input: {
    monitor: 'src/monitor.cjs',
    server: 'src/server.js'
  },
  output: {
    chunkFileNames: '[name]-[hash].cjs',
    dir: 'dist',
    entryFileNames: '[name].cjs',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    commonjs({
      dynamicRequireTargets: [
        './node_modules/elastic-apm-node/**/*.js'
      ]
    }),
    json(),
    resolve({
      preferBuiltins: true
    }),
    terser()
  ]
}
