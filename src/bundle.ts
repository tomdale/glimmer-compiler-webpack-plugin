import { readFile } from 'fs';
import { join } from 'path';
import Debug = require('debug');

const debug = Debug('glimmer-compiler-webpack-plugin:bundle');

import { BundleCompiler, TemplateLocator } from '@glimmer/bundle-compiler';
import { ConstantPool } from '@glimmer/program';
import { AppCompilerDelegate } from '@glimmer/compiler-delegates';
import { AST, preprocess, ASTPluginBuilder } from '@glimmer/syntax';
import { TemplateCompiler } from '@glimmer/compiler';
import { CompilableTemplate } from '@glimmer/opcode-compiler';
import { Project } from 'glimmer-analyzer';

import BinarySource from './binary-source';
import BundlePlugin from './plugin';

const readFileAsync = function readFileAsync(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

export interface Resolver {
  resolveSync(context: {}, path: string, request: string): string | null;
}

export interface Specifiers<TemplateMeta> {
  [key: string]: TemplateLocator<TemplateMeta>;
}

interface BundleOptions<TemplateMeta> {
  delegate: AppCompilerDelegate<TemplateMeta>;
  inputPath: string;
  helpers?: Specifiers<TemplateMeta>;
  mainPath?: string;
  plugins?: BundlePlugin<TemplateMeta>[];
}

export interface DataSegment {
  pool: ConstantPool;
  handle: number;
  table: number[];
  entryHandle: number;
}

export interface BundleCompilation {
  bytecode: BinarySource;
  data: string;
}

/**
 * A Bundle encapsulates the compilation of multiple Glimmer templates into a
 * final compiled binary bundle. After creating a new Bundle, add one or more
 * components with `add()`. Once all components have been added to the bundle,
 * compile and produce a binary output by calling `compile()`.
 */
export default class Bundle<TemplateMeta> {
  public compilation: BundleCompilation;

  protected bundleCompiler: BundleCompiler<TemplateMeta>;
  protected delegate: AppCompilerDelegate<TemplateMeta>;
  protected helpers: Specifiers<TemplateMeta>;
  protected plugins: BundlePlugin<TemplateMeta>[];

  constructor(protected options: BundleOptions<TemplateMeta>) {
    let { delegate, helpers, plugins } = options;

    this.helpers = helpers || {};
    this.delegate = delegate;
    this.plugins = plugins || [];

    this.bundleCompiler = (delegate as any)['compiler'] = new BundleCompiler(delegate);
    if (!options.mainPath) {
      this.bundleCompiler.add({ module: '@glimmer/application', name: 'mainLayout' }, `{{#each roots key="id" as |root|~}}
      {{~#in-element root.parent nextSibling=root.nextSibling~}}
        {{~component root.component~}}
      {{~/in-element~}}
    {{~/each~}}`);
    }
  }

  async add(absoluteModulePath: string, templateSource: string) {
    debug('adding template; path=%s', absoluteModulePath);
    let locator = this.templateLocatorFor(absoluteModulePath);

    let astPlugins = await this.collectASTPluginsFor(locator);

    let { meta } = locator;

    let ast = preprocess(templateSource, { plugins: { ast: astPlugins } });
    let template = TemplateCompiler.compile({ meta }, ast);
    let block = template.toJSON();

    let compilable = CompilableTemplate.topLevel(block, this.bundleCompiler.compileOptions(locator));
    this.bundleCompiler.addCompilableTemplate(locator, compilable);
  }

  async addAST(absoluteModulePath: string, ast: AST.Program) {
    debug('adding template as AST; path=%s', absoluteModulePath);

    let locator = this.templateLocatorFor(absoluteModulePath);
    let template = TemplateCompiler.compile({ meta: locator }, ast)
    let block = template.toJSON();

    let compilable = CompilableTemplate.topLevel(block, this.bundleCompiler.compileOptions(locator));
    this.bundleCompiler.addCompilableTemplate(locator, compilable);
  }

  protected async collectASTPluginsFor(locator: TemplateLocator<TemplateMeta>): Promise<ASTPluginBuilder[]> {
    let astPlugins = await Promise.all(this.plugins.map(plugin => {
      return Promise.resolve(plugin.astPluginsFor(locator));
    }));

    return astPlugins.reduce<ASTPluginBuilder[]>((allPlugins, plugins) => {
      return [...allPlugins, ...plugins];
    }, []);
  }

  protected templateLocatorFor(absoluteModulePath: string) {
    let normalizedPath = this.delegate.normalizePath(absoluteModulePath);
    return this.delegate.templateLocatorFor({ module: normalizedPath, name: 'default' });
  }

  async compile() {
    debug('beginning bundle compilation');

    let { bundleCompiler } = this;

    await this.discoverTemplates();

    let compilation = bundleCompiler.compile();
    let data = this.delegate.generateDataSegment(compilation);

    debug('completed bundle compilation');

    this.compilation = {
      bytecode: new BinarySource(compilation.heap.buffer),
      data
    };

    return this.compilation;
  }

  protected async discoverTemplates() {
    let project = new Project(this.options.inputPath);
    let readTemplates: Promise<[string, string]>[] = [];

    for (let specifier in project.map) {
      let [type] = specifier.split(':');
      if (type === 'template') {
        let filePath = join(this.options.inputPath, project.map[specifier]);
        readTemplates.push(
          Promise.all([
            filePath,
            readFileAsync(filePath),
          ])
        );
      }
    }

    let templates = await Promise.all(readTemplates);

    await Promise.all(templates.map(([path, templateSource]) => {
      return this.add(path, templateSource);
    }));
  }
}
