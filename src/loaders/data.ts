import webpack = require('webpack');
import Debug = require('debug');

const debug = Debug('glimmer-compiler-webpack-plugin:data-loader');

export = async function(this: webpack.loader.LoaderContext, _source: string, _map: string) {
  // Disable caching until we can integrate incremental Glimmer bundle
  // compiling.
  this.cacheable(false);
  let cb = this.async()!;

  debug('building data segment; awaiting compilation');
  let { compiler } = this.query;
  let { data } = await compiler.didCompile;
  debug('compilation complete; resolving data segment loader; data segment=%o', data);

  cb(null, data);
}
