import webpack = require('webpack');
import Debug = require('debug');

const debug = Debug('glimmer-compiler-webpack-plugin:data-loader');

export = function(this: webpack.loader.LoaderContext, _source: string, _map: string) {
  // Disable caching until we can integrate incremental Glimmer bundle
  // compiling.
  this.cacheable(false);

  let module = this._module;
  debug('called for module; module=%s', module);

  if (module.__table) {
    debug('called with existing table; source=%s', module.__table.source());
    return module.__table.source();
  } else {
    debug('no existing table; adding module to compiler');
    let { compiler } = this.query;
    compiler.addDataSegmentModule(this._module);
    return '';
  }
}
