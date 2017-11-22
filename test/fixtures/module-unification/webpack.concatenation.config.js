require('ts-node/register');

const GlimmerCompiler = require('../../../src');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  context: path.resolve(__dirname),
  entry: './index.js',
  target: 'node',
  node: {
    __dirname: false
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'commonjs',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /table\.js$/,
        use: GlimmerCompiler.data()
      }
    ]
  },
  plugins: [
    new GlimmerCompiler({
      output: 'templates.gbx',
      mode: 'module-unification'
    }),
    new webpack.optimize.ModuleConcatenationPlugin()
  ]
}
