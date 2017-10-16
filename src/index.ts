// import { BundleCompiler } from '@glimmer/bundle-compiler';
import { Compiler } from 'webpack';
import { Source } from 'webpack-sources';

import Debug = require('debug');
import { expect } from '@glimmer/util';

import Bundle, { Specifiers, BundleCompilerDelegate } from './bundle';
import Scope from './scope';
import BasicCompilerDelegate from './compiler-delegates/basic';
import ModuleUnificationCompilerDelegate from './compiler-delegates/module-unification';

const debug = Debug('glimmer-compiler-webpack-plugin:plugin');

let loaderOptions: any[] = [];

interface Constructor<T> {
  new (...args: any[]): T;
}

type Mode = 'basic' | 'module-unification';

interface PluginOptions {
  output: string;
  mode?: Mode;
  helpers?: Specifiers;
  CompilerDelegate?: Constructor<BundleCompilerDelegate>;
}

interface Module {
  __table: Source;
  _source: Source;
  parser: any;
  resource: string;
  reasons: any[];
}

interface Callback {
  (err?: Error): void;
}

class GlimmerCompiler {
  static component() { return loader('./loaders/component'); }
  static template() { return loader('./loaders/template'); }
  static data() { return loader('./loaders/data'); }

  bundle: Bundle;
  options: PluginOptions;

  protected outputFile: string;

  protected CompilerDelegate: Constructor<BundleCompilerDelegate> | null;
  protected mode: Mode | null;

  /**
   * Webpack `Module` instances pushed in by the data loader. At compile time,
   * these are populated by the generated Glimmer data segment.
   */
  protected dataSegmentModules: Module[] = [];

  constructor(options: PluginOptions) {
    this.options = options;
    this.outputFile = this.options.output;

    if (options.mode && options.CompilerDelegate) {
      throw new Error(`You can provide a mode or a compiler delegate, but not both.`);
    }

    this.CompilerDelegate = options.CompilerDelegate || null;

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
    let inputPath = expect(compiler.options.context, 'expected compiler to have a context');

    compiler.plugin('this-compilation', (compilation: any) => {
      debug('beginning compilation');

      let resolver = compilation.resolvers.normal;
      let delegate = this.getCompilerDelegateFor(inputPath);

      this.bundle = new Bundle(resolver, {
        inputPath,
        delegate
      });

      this.dataSegmentModules = [];

      let compiled = false;

      compilation.plugin('need-additional-seal', () => {
        if (compiled) { return false; }

        debug('requesting additional seal');
        resetCompilation(compilation);

        return compiled = true;
      });

      compilation.plugin('after-seal', (cb: any) => {
        debug('seal complete');
        cb();
      });

      compilation.plugin('optimize-tree', (_chunks: any[], _modules: Module[], cb: Callback) => {
        debug('optimizing tree');

        if (compiled) {
          debug('skipping second compile');
          return cb();
        }

        let { bytecode, constants, data } = this.bundle.compile();

        let promises = this.dataSegmentModules.map(module => {
          return populateDataSegment(module, compilation, data);
        });

        Promise.all(promises)
          .catch(cb)
          .then(() => cb());

        compilation.plugin('additional-assets', (cb: () => void) => {
          debug('adding additional assets');
          let { output } = this.options;

          compilation.assets[output] = bytecode;
          compilation.assets[`${output}.json`] = constants;
          cb();
        });

      })
    });
  }

  protected getCompilerDelegateFor(inputPath: string) {
    let { mode, CompilerDelegate } = this.options;

    if (!CompilerDelegate) {
      switch (mode) {
        case 'basic':
          CompilerDelegate = BasicCompilerDelegate;
          break;
        case 'module-unification':
          CompilerDelegate = ModuleUnificationCompilerDelegate;
          break;
        default:
          throw new Error(`Unrecognized compiler mode ${mode}`);
      }
    }

    return new CompilerDelegate(inputPath);
  }
}

function resetCompilation(compilation: any) {
  for (let mod of compilation.modules) {
    mod.used = null;
    mod.usedExports = null;
  }

  compilation.finish();
}

// Replaces the passed module's source code with the data segment we code
// generate.
function populateDataSegment(module: any, compilation: any, source: Source): Promise<void> {
  module.__table = source;
  return rebuildModule(module, compilation)
}

// function dumpModule(module: any, depth: number = 0) {
//   if (depth === 0){
//     console.log("DUMP MODULE TREE");
//   }

//   let pad = "  ".repeat(depth);
//   let identifier = module.identifier();

//   console.log(pad, identifier);
//   console.log(pad, '  used', module.used);
//   console.log(pad, '  used exports', module.usedExports);
//   console.log(pad, '  provided exports', module.providedExports);

//   let dependencies = new Set<any>();

//   for (let dep of module.dependencies) {
//     if (dep.module) { dependencies.add(dep.module); }
//   }

//   for (let mod of dependencies) {
//     dumpModule(mod, depth+1);
//   }
// }

function rebuildModule(module: any, compilation: any): Promise<void> {
  return new Promise((resolve, reject) => {
    debug('rebuilding module; module=%s', module);

    compilation.rebuildModule(module, (err: any) => {
      if (err) {
        debug('error rebuilding module; module=%s; err=%o', module, err);
        reject(err);
      } else {
        debug('rebuilt module; module=%s', module);
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
