require('ts-node/register');

const GlimmerCompiler = require('../../../src');
const path = require('path');

module.exports = {
  context: path.resolve(__dirname),
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.hbs$/,
        use: GlimmerCompiler.template()
      },
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
  ]
}
