## Usage

```js
const GlimmerCompiler = require('glimmer-compiler-webpack-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.hbs$/,
        use: GlimmerCompiler.compile()
      }
    ]
  },
  plugins: [
    new GlimmerCompiler('templates.gbx'),
  ]
}
```
