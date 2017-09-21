// import { BundleCompiler } from '@glimmer/bundle-compiler';
import { Compiler } from 'webpack';
import { ConcatSource, Source } from 'webpack-sources';

import Bundle, { Specifiers } from './bundle';
import Scope from './scope';

let loaderOptions: any[] = [];

interface CompilerOptions {
  output: string;
  helpers?: Specifiers;
}

interface Module {
  _source: Source;
}

class GlimmerCompiler {
  static compile() {
    let options = {};
    loaderOptions.push(options);

    return {
      loader: require.resolve('./loaders/component'),
      options
    }
  }

  static bootstrap() {
    let options = {};
    loaderOptions.push(options);

    return {
      loader: require.resolve('./loaders/bootstrap'),
      options
    }
  }

  bundle: Bundle;
  compilerOptions: CompilerOptions;

  private outputFile: string;
  private bootstrapModules: Module[] = [];

  constructor(outputFile: string);
  constructor(options: CompilerOptions);
  constructor(_options: string | CompilerOptions) {
    let options = typeof _options === 'string' ?
      { output: _options } :
      _options;

    this.compilerOptions = options;

    for (let opts of loaderOptions) {
      opts.compiler = this;
    }
    loaderOptions = [];
  }

  addBootstrapModule(module: Module) {
    this.bootstrapModules.push(module);
  }

  addComponent(path: string, template: string, scope: Scope) {
    this.bundle.add(path, template, scope);
  }

  apply(compiler: Compiler) {
    compiler.plugin('this-compilation', compilation => {
      let resolver = compilation.resolvers.normal;
      this.bundle = new Bundle(resolver);

      compilation.plugin('optimize-modules', () => {
        console.log("OPTIMIZING", this.bootstrapModules);
        let { bytecode, constants, table } = this.bundle.compile();

        for (let mod of this.bootstrapModules) {
          debugger;
          console.log('before source:', mod._source.source());
          let source = new ConcatSource(mod._source, table.toSource());
          console.log('after source:', source.source());
          // mod['_source'] = source;
        }

        compilation.plugin('additional-assets', (cb: () => void) => {
          compilation.assets[this.outputFile] = bytecode;
          compilation.assets[this.outputFile + '.json'] = constants;
          cb();
        });

      })
    });
  }
}

export = GlimmerCompiler;
