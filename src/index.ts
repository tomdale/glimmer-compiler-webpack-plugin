// import { BundleCompiler } from '@glimmer/bundle-compiler';
import { Compiler } from 'webpack';

import Bundle from './bundle';
import Scope from './scope';

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

  bundle: Bundle;

  constructor(private outputFile: string) {
    for (let options of loaderOptions) {
      options.compiler = this;
    }
    loaderOptions = [];
  }

  addComponent(path: string, template: string, scope: Scope) {
    this.bundle.add(path, template, scope);
  }

  apply(compiler: Compiler) {
    compiler.plugin('this-compilation', compilation => {
      let resolver = compilation.resolvers.normal;
      this.bundle = new Bundle(resolver);

      // compilation.plugin('seal', (mod: any, cb: () => void) => {
      //   console.log(mod);
      //   cb();
      // });

      compilation.plugin('additional-assets', (cb: () => void) => {
        let { bytecode, constants } = this.bundle.compile();
        compilation.assets[this.outputFile] = bytecode;
        compilation.assets[this.outputFile + '.json'] = constants;
        cb();
      });
    });
  }
}

export = GlimmerCompiler;
