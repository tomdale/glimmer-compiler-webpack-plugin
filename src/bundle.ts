import { RawSource } from 'webpack-sources';
import { BundleCompiler, TemplateLocator } from '@glimmer/bundle-compiler';
import { ConstantPool } from '@glimmer/program';
import { AppCompilerDelegate } from '@glimmer/compiler-delegates';
import { AST } from '@glimmer/syntax';

import { TemplateCompiler } from '@glimmer/compiler';
import { CompilableTemplate } from '@glimmer/opcode-compiler';
import BinarySource from './binary-source';

export interface Resolver {
  resolveSync(context: {}, path: string, request: string): string | null;
}

export interface Specifiers<TemplateMeta> {
  [key: string]: TemplateLocator<TemplateMeta>;
}

interface BundleOptions<TemplateMeta> {
  helpers?: Specifiers<TemplateMeta>;
  delegate: AppCompilerDelegate<TemplateMeta>;
  inputPath: string;
}

export interface DataSegment {
  pool: ConstantPool;
  handle: number;
  table: number[];
  entryHandle: number;
}

type Metadata = {};

/**
 * A Bundle encapsulates the compilation of multiple Glimmer templates into a
 * final compiled binary bundle. After creating a new Bundle, add one or more
 * components with `add()`. Once all components have been added to the bundle,
 * compile and produce a binary output by calling `compile()`.
 */
export default class Bundle<TemplateMeta> {
  protected bundleCompiler: BundleCompiler<TemplateMeta>;
  protected delegate: AppCompilerDelegate<TemplateMeta>;
  protected helpers: Specifiers<TemplateMeta>;

  constructor(protected options: BundleOptions<TemplateMeta>) {
    let { delegate, helpers } = options;

    this.helpers = helpers || {};
    this.delegate = delegate;

    this.bundleCompiler = (delegate as any)['compiler'] = new BundleCompiler(delegate);
    this.bundleCompiler.add({ module: '@glimmer/application', name: 'mainTemplate' }, `{{#each roots key="id" as |root|~}}
    {{~#in-element root.parent nextSibling=root.nextSibling~}}
      {{~component root.component~}}
    {{~/in-element~}}
  {{~/each~}}
  `);
  }

  add(absoluteModulePath: string, templateSource: string, _meta: Metadata) {
    let locator = this.templateLocatorFor(absoluteModulePath);
    this.bundleCompiler.add(locator, templateSource);
  }

  addAST(absoluteModulePath: string, ast: AST.Program) {
    let locator = this.templateLocatorFor(absoluteModulePath);
    let template = TemplateCompiler.compile({ meta: locator }, ast)
    let block = template.toJSON();

    let compilable = CompilableTemplate.topLevel(block, this.bundleCompiler.compileOptions(locator));
    this.bundleCompiler.addCompilableTemplate(locator, compilable);
  }

  protected templateLocatorFor(absoluteModulePath: string) {
    let normalizedPath = this.delegate.normalizePath(absoluteModulePath);
    return this.delegate.templateLocatorFor({ module: normalizedPath, name: 'default' });
  }

  compile() {
    let { bundleCompiler } = this;
    let compilation = bundleCompiler.compile();
    let data = this.delegate.generateDataSegment(compilation);

    return {
      bytecode: new BinarySource(compilation.heap.buffer),
      data: new RawSource(data)
    }
  }
}
