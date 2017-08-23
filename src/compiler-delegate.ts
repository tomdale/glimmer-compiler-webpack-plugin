import { CompilerDelegate, ComponentCapabilities } from '@glimmer/bundle-compiler';
import { Dict, dict } from '@glimmer/util';

import ComponentRegistry from './component-registry';

export type ModuleName = string;
export type NamedExport = string;

export interface Specifier {
  module: NamedExport;
  name: ModuleName;
}

const SPECIFIERS = dict<Dict<Specifier>>();

export function specifier(module: ModuleName, name: NamedExport): Specifier {
  let specifiers = SPECIFIERS[module];
  if (!specifiers) specifiers = SPECIFIERS[module] = dict<Specifier>();

  let specifier = specifiers[name];
  if (!specifier) specifier = specifiers[name] = { module, name };

  return specifier;
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

class Delegate implements CompilerDelegate {
  registry: ComponentRegistry;

  constructor(registry: ComponentRegistry) {
    this.registry = registry;
  }

  hasComponentInScope(componentName: string, referer: Specifier): boolean {
    let name = this.registry.resolve(componentName, referer);
    return !!name;
  }

  resolveComponentSpecifier(componentName: string, referer: Specifier): Specifier {
    return specifier(this.registry.resolve(componentName, referer)!, 'default');
  }

  getComponentCapabilities(specifier: Specifier): ComponentCapabilities {
    return CAPABILITIES;
  }

  getComponentLayout(specifier: Specifier): ICompilableTemplate<ProgramSymbolTable> {
    let compile = this.compile;
    let module = this.compileTimeModules.get(specifier.module)!;
    let table = module.get(specifier.name) as ProgramSymbolTable;

    return {
      symbolTable: table,
      compile(): VMHandle {
        return compile(specifier);
      }
    };
  }

  hasHelperInScope(helperName: string, referer: Specifier): boolean {
    let name = this.modules.resolve(helperName, referer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier {
    let path = this.modules.resolve(helperName, referer);
    return specifier(path!, 'default');
  }

  hasModifierInScope(_modifierName: string, _referer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}
