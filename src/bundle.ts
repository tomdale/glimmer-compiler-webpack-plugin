import { ConcatSource, RawSource } from 'webpack-sources';
import { BundleCompiler, CompilerDelegate, Specifier, specifierFor, SpecifierMap } from '@glimmer/bundle-compiler';
import { expect } from '@glimmer/util';

import ComponentRegistry from './component-registry';
import { ConstantPool } from '@glimmer/program';

export interface Resolver {
  resolveSync(context: {}, path: string, request: string): string | null;
}

export interface Specifiers {
  [key: string]: Specifier;
}

export interface BundleCompilerDelegate extends CompilerDelegate {
  bundleCompiler: BundleCompiler;
  add(modulePath: string, templateSource: string, meta: Metadata): void;
  generateDataSegment(map: SpecifierMap, pool: ConstantPool, heapTable: number[]): string;
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

    this.bundleCompiler = delegate.bundleCompiler = new BundleCompiler(delegate);
  }

  add(modulePath: string, templateSource: string, meta: Metadata) {
    this.delegate.add(modulePath, templateSource, meta);
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

    let data = this.delegate.generateDataSegment(map, pool, heap.table);

    return {
      bytecode: new RawSource(heap.buffer as any),
      constants: new ConcatSource(JSON.stringify(dataSegment)),
      data: new RawSource(data)
    }
  }
}
