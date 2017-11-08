import webpack = require('webpack');
import extractTemplate from '../extract-template';

export = function(this: webpack.loader.LoaderContext, source: string, _map: string) {
  // Disable caching until we can integrate incremental Glimmer bundle
  // compiling.
  this.cacheable(false);

  let { compiler } = this.query;

  let { template, code, scope } = extractTemplate(source);

  if (template) {
    compiler.addComponent(this.resourcePath, template, { scope });
  }

  return code;
}
