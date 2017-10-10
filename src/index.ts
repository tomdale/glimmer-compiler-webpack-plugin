// import { BundleCompiler } from '@glimmer/bundle-compiler';
import { Compiler } from 'webpack';
import { Source } from 'webpack-sources';

import Bundle, { Specifiers } from './bundle';
import Scope from './scope';
import { CompilerDelegate } from '@glimmer/bundle-compiler';
import Debug = require('debug');

const debug = Debug('glimmer-compiler-webpack-plugin:plugin');

let loaderOptions: any[] = [];

interface CompilerOptions {
  output: string;
  helpers?: Specifiers;
  compilerDelegate?: CompilerDelegate;
}

interface Module {
  _source: Source;
  parser: any;
}

interface Callback {
  (err?: Error): void;
}

class GlimmerCompiler {
  static component() { return loader('./loaders/component'); }
  static template() { return loader('./loaders/template'); }
  static data() { return loader('./loaders/data'); }

  bundle: Bundle;
  compilerOptions: CompilerOptions;

  private outputFile: string;

  /**
   * Webpack `Module` instances pushed in by the data loader. At compile time,
   * these are populated by the generated Glimmer data segment.
   */
  private dataSegmentModules: Module[] = [];

  constructor(options: string | CompilerOptions) {
    if (typeof options === 'string') {
      this.compilerOptions = { output: options };
    } else {
      this.compilerOptions = options;
    }

    this.outputFile = this.compilerOptions.output;

    for (let opts of loaderOptions) {
      opts.compiler = this;
    }

    loaderOptions = [];
  }

  /**
   * Used by the data loader when it discovers a module that should be populated
   * with the compiled data segment.
   */
  addDataSegmentModule(module: Module) {
    this.dataSegmentModules.push(module);
  }

  /**
   * Used by the component loader when it discovers a module that contains a
   * component template.
   */
  addComponent(path: string, template: string, scope: Scope) {
    this.bundle.add(path, template, scope);
  }

  apply(compiler: Compiler) {
    debug('applying plugin');

    compiler.plugin('this-compilation', (compilation: any) => {
      debug('beginning compilation');

      let resolver = compilation.resolvers.normal;

      this.bundle = new Bundle(resolver, { compilerDelegate: this.compilerOptions.compilerDelegate });
      this.dataSegmentModules = [];

      compilation.plugin('optimize-tree', (_chunks: any[], _modules: Module[], cb: Callback) => {
        debug('optimizing tree');
        let { bytecode, constants, table } = this.bundle.compile();

        let promises: Promise<void>[] = [];
        for (let module of this.dataSegmentModules) {
          let promise = populateDataSegment(module, compilation, table.toSource('./src/glimmer/table.ts'));
          promises.push(promise);
        }

        Promise.all(promises)
          .catch(cb)
          .then(() => cb());

        compilation.plugin('additional-assets', (cb: () => void) => {
          debug('adding additional assets');
          let { output } = this.compilerOptions;

          compilation.assets[output] = bytecode;
          compilation.assets[`${output}.json`] = constants;
          cb();
        });

      })
    });
  }
}

// Replaces the passed module's source code with the data segment we code
// generate.
function populateDataSegment(module: Module, compilation: any, source: Source): Promise<void> {
  let { options } = compilation;

  module._source = source;

  module.parser.parse(source.source(), {
    module,
    compilation,
    options,
    current: module,
  });

  return new Promise((resolve, reject) => {
    debug('reprocessing data segment dependencies');
    compilation.processModuleDependencies(module, (err: any) => {
      if (err) {
        debug('error processing data segment', err);
        reject(err);
      } else {
        debug('reprocessed data segment dependencies');
        resolve();
      }
    });
  });
}

function loader(loaderPath: string) {
  debug('generating loader', loaderPath);

  let options = {};
  loaderOptions.push(options);

  return {
    loader: require.resolve(loaderPath),
    options
  }
}

export = GlimmerCompiler;
