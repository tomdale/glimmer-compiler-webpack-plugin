# Glimmer Compiler for Webpack

This webpack plugin allows you to compile Glimmer.js components into binary
bytecode.

**Note: Please don't use this plugin yet. It isn't quite ready and will just
frustrate you if you try to use it now. Soon! 🤗**

## Usage

1. Configure the template and data table loaders.
2. Register the `GlimmerCompiler` plugin with appropriate configuration options.
3. In your entry file, load the template bytecode and data table and initialize
   a new Glimmer.js application.

In webpack.config.js:

```js
const GlimmerCompiler = require('glimmer-compiler-webpack-plugin');

module.exports = {
  module: {
    rules: [
      // Tell webpack how to find component templates
      {
        test: /\.hbs$/,
        use: GlimmerCompiler.template()
      },
      // Tell webpack where to put compilation metadata
      {
        test: /data\.js$/,
        use: GlimmerCompiler.data()
      }
    ]
  },
  plugins: [
    // Register the compiler plugin and configure where to
    // put the binary bytecode (.gbx file).
    new GlimmerCompiler({
      output: 'templates.gbx',
      mode: 'module-unification'
    }),
  ]
}
```

In your app's entry point file:

```ts
import Application, { DOMBuilder, AsyncRenderer, BytecodeLoader } from '@glimmer/application';

import data from './data';

let bytecode = fetch('templates.gbx')
  .then(req => req.arrayBuffer());

let element = document.getElementById('app');

let app = new Application({
  builder: new DOMBuilder({ element }),
  renderer: new AsyncRenderer(),
  loader: new BytecodeLoader({ data, bytecode })
});

app.boot();
```

## About This Plugin

Glimmer.js is a library for authoring UI components for the web. To make those
components lightning fast, Glimmer compiles component templates into a binary
bytecode. This plugin adds support for running the compilation process with
webpack.

## Component Discovery

In order to discover which components are used in a particular compilation, you
must use the provided `GlimmerCompiler.template()` loader to load `.hbs` files.

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.hbs$/,
        use: GlimmerCompiler.template()
      },
      /* ... */
    ]
  },
  /* ... */
}
```

Template files must be imported from the entry file or another JavaScript file
in order to be included in the bundle:

```js
import 'src/ui/components/UserProfile/template.hbs';
import 'src/ui/components/Avatar/template.hbs';
// ...
```

The files themselves will be removed from the JavaScript bundle and instead
placed in the compiled bytecode (`.gbx` file).

## Build Artifacts

In order to run your app in the browser, Glimmer needs two artifacts
from the compilation process:

1. A "data table" that links the Glimmer bytecode to JavaScript objects.
2. The bytecode itself.

### Data Table

The plugin will generate the data table as a module that can be imported like
any other JavaScript module. You tell the compiler which module to populate with the
data table using a loader.

In your webpack.config.js:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /data\.js$/,
        use: GlimmerCompiler.data()
      },
      /* ... */
    ]
  },
  /* ... */
}
```

Then create an empty file that matches the loader rule, like `data.js`.

From your entry point file, you can import the data like a normal module:

```js
import data from './data';
```

### Binary Bytecode

Glimmer compiles your application's templates into binary bytecode that is saved in a `.gbx` file.
To tell where this binary should be placed in the output, pass the `output` configuration to the
plugin constructor:

```js
module.exports = {
  /* ... */
  plugins: [
    // Register the compiler plugin and configure where to
    // put the binary bytecode (.gbx file).
    new GlimmerCompiler({
      output: 'templates.gbx',
      mode: 'module-unification'
    }),
  ]
}
```

You can fetch the bytecode file at runtime in your app by using `fetch()` and retrieving the data
as an `ArrayBuffer`:

```js
let bytecode = fetch('templates.gbx')
  .then(req => req.arrayBuffer());
```
