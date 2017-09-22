import { ConcatSource, RawSource } from 'webpack-sources';
import { BundleCompiler, CompilerDelegate, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { ICompilableTemplate } from '@glimmer/opcode-compiler';
import { ComponentCapabilities, ProgramSymbolTable, VMHandle } from '@glimmer/interfaces';
import { SerializedTemplateBlock } from '@glimmer/wire-format';
import * as path from 'path';
import { sync as resolveSync } from 'resolve';

import { expect } from '@glimmer/util';

import ComponentRegistry from './component-registry';
import Scope from './scope';
import ExternalModuleTable from './external-module-table';

export interface Resolver {
  resolveSync(context: {}, path: string, request: string): string | null;
}

const CAPABILITIES = {
  dynamicLayout: false,
  prepareArgs: false,
  elementHook: true,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

export interface Specifiers {
  [key: string]: Specifier;
}

interface BundleOptions {
  helpers?: Specifiers;
}

/**
 * A Bundle encapsulates the compilation of multiple Glimmer templates into a
 * final compiled binary bundle. After creating a new Bundle, add one or more
 * components with `add()`. Once all components have been added to the bundle,
 * compile and produce a binary output by calling `compile()`.
 */
export default class Bundle implements CompilerDelegate {
  protected resolver: Resolver;
  protected bundleCompiler: BundleCompiler = new BundleCompiler(this);
  protected registry = new ComponentRegistry();
  protected scopes = new Map<Specifier, Scope>();
  protected serializedTemplateBlocks = new Map<Specifier, SerializedTemplateBlock>();
  protected helpers: Specifiers;

  constructor(resolver: Resolver, options: BundleOptions = {}) {
    this.helpers = options.helpers || {};
    this.resolver = resolver;
  }

  add(modulePath: string, templateSource: string, scope: Scope) {
    let specifier = specifierFor(modulePath, 'default');
    let block = this.bundleCompiler.add(specifier, templateSource);

    this.serializedTemplateBlocks.set(specifier, block);
    this.scopes.set(specifier, scope);
  }

  compile() {
    let { bundleCompiler } = this;
    let { heap, pool } = bundleCompiler.compile();
    let map = bundleCompiler.getSpecifierMap();
    let entry = specifierFor('./src/glimmer/components/Entry.ts', 'default');
    let table = new ExternalModuleTable(map);

    let entryHandle = map.vmHandleBySpecifier.get(entry);

    let json = {
      handle: heap.handle,
      table: heap.table,
      pool,
      entryHandle
    };

    return {
      bytecode: new RawSource(heap.buffer as any),
      constants: new ConcatSource(JSON.stringify(json)),
      table
    }
  }

  hasComponentInScope(componentName: string, referrer: Specifier): boolean {
    let scope = expect(this.scopes.get(referrer), `could not find scope for ${referrer}`);
    
    return componentName in scope;
  }

  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
    let scope = expect(this.scopes.get(referrer), `could not find scope for ${referrer}`);

    let { module, name } = scope[componentName];

    let basedir = path.dirname(path.resolve(process.cwd(), referrer.module));
    let resolved = resolveSync(module, { basedir, extensions: ['.ts', '.js'] });
    resolved = './' + path.relative(process.cwd(), resolved);

    return specifierFor(resolved, name);
  }

  getComponentCapabilities(_specifier: Specifier): ComponentCapabilities {
    return CAPABILITIES;
  }

  getComponentLayout(specifier: Specifier): ICompilableTemplate<ProgramSymbolTable> {
    let compile = () => {
      return this.bundleCompiler.compileSpecifier(specifier);
    };

    let block = expect(this.serializedTemplateBlocks.get(specifier), `could not find serialized template block for ${JSON.stringify(specifier)}`);

    return {
      symbolTable: {
        hasEval: block.hasEval,
        symbols: block.symbols,
        referrer: specifier
      },
      compile(): VMHandle {
        return compile();
      }
    };
  }

  hasHelperInScope(_helperName: string, _referer: Specifier): boolean {
    return false;
    // throw new Error("Method not implemented.");
  }

  resolveHelperSpecifier(_helperName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }

  hasModifierInScope(_modifierName: string, _referer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }

  resolveModifierSpecifier(_modifierName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }

  hasPartialInScope(_partialName: string, _referer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }

  resolvePartialSpecifier(_partialName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}
