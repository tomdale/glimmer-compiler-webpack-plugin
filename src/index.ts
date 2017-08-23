import { BundleCompiler } from '@glimmer/bundle-compiler';
import { Compiler } from 'webpack';
import { writeFile } from 'fs';

import ComponentRegistry, { Scope } from './component-registry';

let loaderOptions: any[] = [];

class GlimmerCompiler {
  static compile() {
    let options = {};
    loaderOptions.push(options);

    return {
      loader: require.resolve('./loader'),
      options
    }
  }

  templates: string[] = [];
  registry: ComponentRegistry;

  constructor(private outputFile: string) {
    for (let options of loaderOptions) {
      options.compiler = this;
    }
    loaderOptions = [];

    this.registry = new ComponentRegistry();
  }

  addComponent(path: string, template: string, scope: Scope) {
    this.registry.register(path, scope);
    this.bundle.add(path, template);
  }

  apply(compiler: Compiler) {
    compiler.plugin('emit', (compilation, cb) => {
      writeFile(this.outputFile, this.templates.join('\n'), { encoding: 'utf8' }, err => {
        cb();
      });
    });
  }

}

export = GlimmerCompiler;
