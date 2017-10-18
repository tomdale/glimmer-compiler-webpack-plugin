import webpack = require('webpack');
import { relative } from 'path';

export = function(this: webpack.loader.LoaderContext, source: string, _map: string) {
  // Disable caching until we can integrate incremental Glimmer bundle
  // compiling.
  this.cacheable(false);

  let { compiler } = this.query;

  // Get the path of the module relative to the project root.
  let relativePath = relative(process.cwd(), this.resourcePath);
  relativePath = `./${relativePath}`;

  let ast = JSON.parse(source);
  compiler.addAST(relativePath, ast);

  return '';
}
