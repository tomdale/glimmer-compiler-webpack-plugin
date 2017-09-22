import webpack = require('webpack');

export = function(this: webpack.loader.LoaderContext, _source: string, _map: string) {
  // Disable caching until we can integrate incremental Glimmer bundle
  // compiling.
  this.cacheable(false);

  let { compiler } = this.query;

  compiler.addDataSegmentModule(this._module);

  return '';
}
