require('ts-node/register');

const GlimmerCompiler = require('../../../src');
const path = require('path');

class ASTRewriterPlugin {
  astPluginsFor(locator) {
    return [
      () => ({
        name: 'plugin',
        visitor: {
          TextNode(node) {
            node.chars = node.chars.replace(/Hello/, 'Goodbye');
          }
        }
      })
    ];
  }
}

class AsyncASTRewriterPlugin {
  astPluginsFor(locator) {
    return Promise.resolve([
      () => ({
        name: 'async-plugin',
        visitor: {
          TextNode(node) {
            node.chars = node.chars.replace(/world/, 'universe');
          }
        }
      })
    ]);
  }
}

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
      mode: 'module-unification',
      plugins: [
        new ASTRewriterPlugin(),
        new AsyncASTRewriterPlugin()
      ]
    }),
  ]
}
