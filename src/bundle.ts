import { ConcatSource } from 'webpack-sources';
import { BundleCompiler, CompilerDelegate, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, VMHandle, ICompilableTemplate } from '@glimmer/opcode-compiler';
import { ProgramSymbolTable } from '@glimmer/interfaces';
import { SerializedTemplateBlock } from '@glimmer/wire-format';

import { expect } from '@glimmer/util';

import ComponentRegistry from './component-registry';
import Scope from './scope';

export interface Resolver {
  resolveSync(path: string, request: string): string | null;
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

export default class Bundle implements CompilerDelegate {
  resolver: Resolver;
  bundleCompiler: BundleCompiler = new BundleCompiler(this);
  registry = new ComponentRegistry();
  scopes = new Map<Specifier, Scope>();
  serializedTemplateBlocks = new Map<Specifier, SerializedTemplateBlock>();

  constructor(resolver: Resolver) {
    this.resolver = resolver;
  }

  add(modulePath: string, templateSource: string, scope: Scope) {
    let specifier = specifierFor(modulePath, 'default');
    let block = this.bundleCompiler.add(specifier, templateSource);

    this.serializedTemplateBlocks.set(specifier, block);
    this.scopes.set(specifier, scope);
  }

  compile() {
    let { heap } = this.bundleCompiler.compile();
    return new ConcatSource(JSON.stringify(heap['heap']));
  }

  hasComponentInScope(componentName: string, referrer: Specifier): boolean {
    let scope = expect(this.scopes.get(referrer), `could not find scope for ${referrer}`);
    
    return componentName in scope;
  }

  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
    let scope = expect(this.scopes.get(referrer), `could not find scope for ${referrer}`);

    let { module, name } = scope[componentName];
    let resolved = expect(this.resolver.resolveSync(module, referrer.module), `could not resolve module ${module} from ${referrer.module}`);

    return specifierFor(resolved, name);
  }

  getComponentCapabilities(_specifier: Specifier): ComponentCapabilities {
    return CAPABILITIES;
  }

  getComponentLayout(specifier: Specifier): ICompilableTemplate<ProgramSymbolTable> {
    let compile = () => {
      return this.bundleCompiler.compileSpecifier(specifier);
    };

    let block = expect(this.serializedTemplateBlocks.get(specifier), `could not find serialized template block for ${specifier}`);

    return {
      symbolTable: {
        hasEval: block.hasEval,
        symbols: block.symbols,
        referer: specifier
      },
      compile(): VMHandle {
        return compile();
      }
    };
  }

  hasHelperInScope(_helperName: string, _referer: Specifier): boolean {
    throw new Error("Method not implemented.");
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