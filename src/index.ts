import { Compiler } from 'webpack';
import { Source } from 'webpack-sources';

import Debug = require('debug');

import { expect } from '@glimmer/util';
import { AST } from '@glimmer/syntax';
import { AppCompilerDelegate, MUCompilerDelegate, Builtins } from '@glimmer/compiler-delegates';

import Bundle, { Specifiers, BundleCompilation } from './bundle';
import BundlePlugin from './plugin';

const debug = Debug('glimmer-compiler-webpack-plugin:plugin');

let loaderOptions: any[] = [];

interface Constructor<T> {
  new (...args: any[]): T;
}

type Mode = 'basic' | 'module-unification';

interface PluginOptions<TemplateMeta> {
  output: string;
  context?: string;
  mode?: Mode;
  helpers?: Specifiers<TemplateMeta>;
  CompilerDelegate?: Constructor<AppCompilerDelegate<{}>>;
  builtins?: Builtins;
  mainPath?: string;
  plugins?: BundlePlugin<TemplateMeta>[];
}

interface Module {
  __table: Source;
  _source: Source;
  parser: any;
  resource: string;
  reasons: any[];
}

class GlimmerCompiler {
  static component() { return loader('./loaders/component'); }
  static ast() { return loader('./loaders/ast'); }
  static data() { return loader('./loaders/data'); }

  component() { return instanceLoader('./loaders/component', this); }
  ast() { return instanceLoader('./loaders/ast', this); }
  data() { return instanceLoader('./loaders/data', this); }

  bundle: Bundle<{}>;
  options: PluginOptions<{}>;

  protected outputFile: string;

  protected CompilerDelegate: Constructor<AppCompilerDelegate<{}>> | null;
  protected mode: Mode | null;

  /**
   * Webpack `Module` instances pushed in by the data loader. At compile time,
   * these are populated by the generated Glimmer data segment.
   */
  protected dataSegmentModules: Module[] = [];
  protected loaderOptions: any[];

  constructor(options: PluginOptions<{}>) {
    this.options = options;
    this.outputFile = this.options.output;

    if (options.mode && options.CompilerDelegate) {
      throw new Error(`You can provide a mode or a compiler delegate, but not both.`);
    }

    this.CompilerDelegate = options.CompilerDelegate || null;

    for (let opts of loaderOptions) {
      opts.compiler = this;
    }

    this.loaderOptions = loaderOptions;

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
  addComponent(path: string, templateSource: string) {
    this.bundle.add(path, templateSource);
  }

  addAST(path: string, ast: AST.Program) {
    this.bundle.addAST(path, ast);
  }

  apply(compiler: Compiler) {
    debug('applying plugin');
    let inputPath = expect(this.options.context || compiler.options.context, 'expected compiler to have a context');

    compiler.plugin('this-compilation', (compilation: any) => {
      debug('beginning compilation');

      try {
        let bundle = this.bundle = this.getBundleFor(inputPath);
        this.didCompile = bundle.compile();

        this.didCompile.then(() => {
          compilation.plugin('additional-assets', (cb: () => void) => {
            debug('adding additional assets');
            let { output } = this.options;
            let bytecode = bundle.compilation.bytecode;

            compilation.assets[output] = bytecode;
            cb();
          });
        }, err => compilation.errors.push(err));
      } catch (err) {
        compilation.errors.push(err);
      }
    });
  }

  /**
   * Promise that resolves once Glimmer template compilation has completed.
   */
  didCompile: Promise<BundleCompilation>;

  protected getBundleFor(inputPath: string) {
    let delegate = this.getCompilerDelegateFor(inputPath);
    let { mainPath, plugins } = this.options;

    return new Bundle({
      inputPath,
      delegate,
      mainPath,
      plugins
    });
  }

  protected getCompilerDelegateFor(inputPath: string) {
    let { mode, CompilerDelegate } = this.options;

    if (!CompilerDelegate) {
      switch (mode) {
        case 'module-unification':
          CompilerDelegate = MUCompilerDelegate;
          break;
        default:
          throw new Error(`Unrecognized compiler mode ${mode}`);
      }
    }

    let locator;
    if (this.options.mainPath) {
      let { mainPath } = this.options;
      locator = { module: mainPath, name: 'default' }
    }

    return new CompilerDelegate!({
      projectPath: inputPath,
      outputFiles: {
        dataSegment: 'table.js',
        heapFile: 'templates.gbx'
      },
      builtins: this.options.builtins,
      mainTemplateLocator: locator
    });
  }
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

function instanceLoader(loaderPath: string, compiler: any) {
  debug('generating instance loader', loaderPath);

  let options = { compiler };
  compiler.loaderOptions.push(options);

  return {
    loader: require.resolve(loaderPath),
    options
  }
}

export = GlimmerCompiler;
