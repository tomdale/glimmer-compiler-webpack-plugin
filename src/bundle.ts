import { ConcatSource, RawSource } from 'webpack-sources';
import { BundleCompiler, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { expect } from '@glimmer/util';
import { ConstantPool } from '@glimmer/program';
import { BundleCompilerDelegate } from '@glimmer/compiler-delegates';
import { AST } from '@glimmer/syntax';

import ComponentRegistry from './component-registry';
import { TemplateCompiler } from '@glimmer/compiler';
import { CompilableTemplate } from '@glimmer/opcode-compiler';
import BinarySource from './binary-source';

export interface Resolver {
  resolveSync(context: {}, path: string, request: string): string | null;
}

export interface Specifiers {
  [key: string]: Specifier;
}

interface BundleOptions {
  helpers?: Specifiers;
  delegate: BundleCompilerDelegate;
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
export default class Bundle {
  protected bundleCompiler: BundleCompiler;
  protected delegate: BundleCompilerDelegate;
  protected registry = new ComponentRegistry();
  protected helpers: Specifiers;

  constructor(protected options: BundleOptions) {
    let { delegate, helpers } = options;

    this.helpers = helpers || {};
    this.delegate = delegate;

    this.bundleCompiler =  new BundleCompiler(delegate);
  }

  add(absoluteModulePath: string, templateSource: string, _meta: Metadata) {
    let specifier = this.normalizeSpecifier(absoluteModulePath);
    this.bundleCompiler.add(specifier, templateSource);
  }

  addAST(modulePath: string, ast: AST.Program) {
    let normalizedPath = this.delegate.normalizePath(modulePath);
    let specifier = this.delegate.specifierFor(normalizedPath);

    let template = TemplateCompiler.compile({ meta: specifier }, ast)
    let block = template.toJSON();

    let compilable = CompilableTemplate.topLevel(block, this.bundleCompiler.compileOptions(specifier));
    this.bundleCompiler.addCustom(specifier, compilable);
  }

  protected normalizeSpecifier(absoluteModulePath: string) {
    let normalizedPath = this.delegate.normalizePath(absoluteModulePath);
    return specifierFor(normalizedPath, 'default');
  }

  compile() {
    let { bundleCompiler } = this;
    let { heap, pool } = bundleCompiler.compile();
    let map = bundleCompiler.getSpecifierMap();
    let entryHandle;

    for (let [specifier, handle] of map.vmHandleBySpecifier) {
      if (specifier.module === 'src/ui/components/Main/template.hbs') {
        entryHandle = handle;
      }
    }

    // let entry = specifierFor('src/ui/components/Main/template.hbs', 'default');
    entryHandle = expect(entryHandle, 'Should have entry handle');

    let dataSegment = {
      map,
      pool,
      entryHandle,
      heap: {
        table: heap.table,
        handle: heap.handle
      },
      compiledBlocks: bundleCompiler.compiledBlocks
    };

    let data = this.delegate.generateDataSegment(dataSegment);

    return {
      bytecode: new BinarySource(heap.buffer),
      constants: new ConcatSource(JSON.stringify(dataSegment)),
      data: new RawSource(data)
    }
  }
}
