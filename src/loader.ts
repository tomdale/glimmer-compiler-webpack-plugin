import webpack = require('webpack');
import { relative } from 'path';

import extractTemplate from './extract-template';

export = function(this: webpack.loader.LoaderContext, source: string, _map: string) {
  let { compiler } = this.query;

  // Get the path of the module relative to the project root.
  let relativePath = relative(this.context, this.resourcePath);

  let { template, code, scope } = extractTemplate(source);

  if (template) {
    compiler.addComponent(relativePath, template, scope);
  }

  return code;
}
