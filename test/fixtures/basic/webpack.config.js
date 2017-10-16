require('ts-node/register');

const GlimmerCompiler = require('../../../src');
const path = require('path');

module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: GlimmerCompiler.component()
      }
    ]
  },
  plugins: [
    new GlimmerCompiler({
      mode: 'basic',
      output: 'templates.gbx'
    }),
  ]
}
