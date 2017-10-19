import * as path from 'path';
import { sync as resolveSync } from 'resolve';

import { ICompilableTemplate, CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from '@glimmer/interfaces';
import { expect } from '@glimmer/util';
import { specifierFor, BundleCompiler, Specifier } from '@glimmer/bundle-compiler';
import Scope from '../scope';
import { SerializedTemplateBlock } from '@glimmer/wire-format';
import { BundleCompilerDelegate } from '../bundle';
import { TemplateCompiler } from '@glimmer/compiler';
import { AST } from '@glimmer/syntax';

const CAPABILITIES = {
  dynamicLayout: false,
  prepareArgs: false,
  elementHook: true,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

interface BasicMetadata {
  scope: Scope;
}

export default class BasicCompilerDelegate implements BundleCompilerDelegate {
  bundleCompiler: BundleCompiler;

  protected scopes = new Map<Specifier, Scope>();

  add(modulePath: string, templateSource: string, meta: BasicMetadata) {
    let specifier = specifierFor(modulePath, 'default');
    this.bundleCompiler.add(specifier, templateSource);

    this.scopes.set(specifier, meta.scope);
  }

  addAST(modulePath: string, ast: AST.Program) {
    let specifier = specifierFor(modulePath, 'default');

    let template = TemplateCompiler.compile({ meta: specifier }, ast)
    let block = template.toJSON();

    let compilable = CompilableTemplate.topLevel(block, this.bundleCompiler.compileOptions(specifier));
    this.bundleCompiler.addCustom(specifier, compilable);
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

  getComponentLayout(_specifier: Specifier, block: SerializedTemplateBlock, options: CompileOptions<Specifier>): ICompilableTemplate<ProgramSymbolTable> {
    return CompilableTemplate.topLevel(block, options);
  }

  hasHelperInScope(_helperName: string, _referer: Specifier): boolean {
    return false;
  }

  generateDataSegment() {
    return '';
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
