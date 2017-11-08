import * as path from 'path';
import { sync as resolveSync } from 'resolve';

import { ICompilableTemplate, CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from '@glimmer/interfaces';
import { expect } from '@glimmer/util';
import { BundleCompiler, TemplateLocator, ModuleLocator } from '@glimmer/bundle-compiler';
import Scope from '../scope';
import { SerializedTemplateBlock } from '@glimmer/wire-format';
import { AppCompilerDelegate } from '@glimmer/compiler-delegates';

const CAPABILITIES = {
  dynamicLayout: false,
  prepareArgs: false,
  elementHook: true,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

export interface BasicMeta {
  scope: Scope;
}

export default class BasicCompilerDelegate implements AppCompilerDelegate<BasicMeta> {
  bundleCompiler: BundleCompiler;

  normalizePath(absoluteModulePath: string) {
    return absoluteModulePath;
  }

  templateLocatorFor({ module, name }: ModuleLocator) {
    return {
      module,
      name,
      meta: {
        scope: {}
      }
    }
  }

  hasComponentInScope(componentName: string, referrer: TemplateLocator<BasicMeta>): boolean {
    let scope = expect(referrer.meta!.scope, `could not find scope for ${referrer}`);

    return componentName in scope;
  }

  resolveComponent(componentName: string, referrer: TemplateLocator<BasicMeta>): ModuleLocator {
    let scope = expect(referrer.meta!.scope, `could not find scope for ${referrer}`);

    let { module, name } = scope[componentName];

    let basedir = path.dirname(path.resolve(process.cwd(), referrer.module));
    let resolved = resolveSync(module, { basedir, extensions: ['.ts', '.js'] });
    resolved = './' + path.relative(process.cwd(), resolved);

    return { module: resolved, name };
  }

  getComponentCapabilities(_locator: TemplateLocator<BasicMeta>): ComponentCapabilities {
    return CAPABILITIES;
  }

  getComponentLayout(_locator: TemplateLocator<BasicMeta>, block: SerializedTemplateBlock, options: CompileOptions<TemplateLocator<BasicMeta>>): ICompilableTemplate<ProgramSymbolTable> {
    return CompilableTemplate.topLevel(block, options);
  }

  hasHelperInScope(_helperName: string, _referrer: TemplateLocator<BasicMeta>): boolean {
    return false;
  }

  generateDataSegment() {
    return '';
  }

  resolveHelper(_helperName: string, _referrer: TemplateLocator<BasicMeta>): ModuleLocator {
    throw new Error("Method not implemented.");
  }

  hasModifierInScope(_modifierName: string, _referrer: TemplateLocator<BasicMeta>): boolean {
    throw new Error("Method not implemented.");
  }

  resolveModifier(_modifierName: string, _referrer: TemplateLocator<BasicMeta>): ModuleLocator {
    throw new Error("Method not implemented.");
  }

  hasPartialInScope(_partialName: string, _referrer: TemplateLocator<BasicMeta>): boolean {
    throw new Error("Method not implemented.");
  }

  resolvePartial(_partialName: string, _referer: TemplateLocator<BasicMeta>): ModuleLocator {
    throw new Error("Method not implemented.");
  }
}
