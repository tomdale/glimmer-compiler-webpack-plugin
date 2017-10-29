import { ConcatSource, RawSource } from 'webpack-sources';
import { BundleCompiler, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { expect } from '@glimmer/util';
import { ConstantPool } from '@glimmer/program';
import { BundleCompilerDelegate } from '@glimmer/compiler-delegates';

import ComponentRegistry from './component-registry';

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

  protected normalizeSpecifier(absoluteModulePath: string) {
    let normalizedPath = this.delegate.normalizePath(absoluteModulePath);
    return specifierFor(normalizedPath, 'default');
  }

  compile() {
    let { bundleCompiler } = this;
    let { heap, pool } = bundleCompiler.compile();
    let map = bundleCompiler.getSpecifierMap();
    let entry = specifierFor('./src/glimmer/components/Entry.ts', 'default');
    let entryHandle = expect(map.vmHandleBySpecifier.get(entry) || -1, 'Should have entry handle');

    let dataSegment = {
      handle: heap.handle,
      table: heap.table,
      pool,
      entryHandle
    };

    let data = this.delegate.generateDataSegment(map, pool, heap.table, heap.handle, bundleCompiler.compiledBlocks);

    return {
      bytecode: new RawSource(heap.buffer as any),
      constants: new ConcatSource(JSON.stringify(dataSegment)),
      data: new RawSource(data)
    }
  }
}
