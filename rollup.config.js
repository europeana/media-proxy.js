import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/server.js',
  output: {
    file: 'dist/server.cjs',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    commonjs(),
    json(),
    resolve(),
    terser()
  ]
}
