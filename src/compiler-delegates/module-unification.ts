import { relative } from 'path';
import Debug = require('debug');
import { Project } from 'glimmer-analyzer';

import { Specifier, specifierFor, BundleCompiler, SpecifierMap } from '@glimmer/bundle-compiler';
import { CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';
import { expect, Dict } from '@glimmer/util';

import { BundleCompilerDelegate } from '../bundle';
import { getImportStatements } from './utils/codegen';
import { ConstantPool } from '@glimmer/program';
import { SymbolTable } from '@glimmer/interfaces';

const debug = Debug('glimmer-compiler-webpack-plugin:mu-delegate');

const CAPABILITIES = {
  dynamicLayout: false,
  prepareArgs: false,
  elementHook: true,
  staticDefinitions: false,
  dynamicTag: true,
  createArgs: true,
  attributeHook: true
};

const BUILTINS = ['action', 'if'];

export default class ModuleUnificationCompilerDelegate implements BundleCompilerDelegate {
  public bundleCompiler: BundleCompiler;
  protected project: Project;
  protected specifiersToSymbolTable: Map<Specifier, SymbolTable> = new Map();

  constructor(protected projectPath: string) {
    debug('initialized MU compiler delegate; project=%s', projectPath);
    this.project = new Project(projectPath);
  }

  add(modulePath: string, templateSource: string, meta: {}) {
    let normalizedPath = this.pathRelativeFromProject(modulePath);
    let specifier = specifierFor(normalizedPath, 'default');

    debug('add; path=%s; specifier=%s; meta=%o; template=%o', modulePath, normalizedPath, meta, templateSource);

    let block = this.bundleCompiler.add(specifier, templateSource);

    let symbolTable = {
      hasEval: block.hasEval,
      symbols: block.symbols,
      referrer: specifier
    };

    this.specifiersToSymbolTable.set(specifier, symbolTable);
  }

  hasComponentInScope(name: string, referrer: Specifier) {
    debug('hasComponentInScope; name=%s; referrer=%o', name, referrer);

    let referrerSpec = expect(
      this.project.specifierForPath(referrer.module),
      `The component <${name}> was used in ${referrer.module} but could not be found.`
    );

    return !!this.project.resolver.identify(`template:${name}`, referrerSpec);
  }

  resolveComponentSpecifier(name: string, referrer: Specifier) {
    let referrerSpec = expect(this.project.specifierForPath(referrer.module), `expected specifier for path ${referrer.module}`);
    let resolved = this.project.resolver.identify(`template:${name}`, referrerSpec);

    let resolvedSpecifier = this.getCompilerSpecifier(resolved);
    return resolvedSpecifier;
  }

  /**
   * Converts a path relative to the current working directory into a path
   * relative to the project root.
   */
  protected pathRelativeFromProject(modulePath: string): string {
    let project = this.project;
    let projectPath = relative(process.cwd(), project.projectDir);

    return relative(projectPath, modulePath);
  }

  protected getCompilerSpecifier(specifier: string): Specifier {
    let modulePath = expect(this.project.pathForSpecifier(specifier), `couldn't find module with specifier '${specifier}'`);

    return specifierFor(modulePath, 'default');
  }

  getComponentCapabilities() {
    return CAPABILITIES;
  }

  hasHelperInScope(helperName: string, referrer: Specifier) {
    if (BUILTINS.indexOf(helperName) > -1) { return true; }

    let referrerSpec = this.project.specifierForPath(referrer.module) || undefined;
    return !!this.project.resolver.identify(`helper:${helperName}`, referrerSpec);
  }

  resolveHelperSpecifier(helperName: string, referrer: Specifier) {
    if (BUILTINS.indexOf(helperName) > -1) {
      return specifierFor('__BUILTIN__', helperName);
    }

    let referrerSpec = this.project.specifierForPath(referrer.module) || undefined;
    let resolvedSpec = this.project.resolver.identify(`helper:${helperName}`, referrerSpec);

    return this.getCompilerSpecifier(resolvedSpec);
  }

  getComponentLayout(_specifier: Specifier, block: SerializedTemplateBlock, options: CompileOptions<Specifier>) {
    return CompilableTemplate.topLevel(block, options);
  }

  generateDataSegment(map: SpecifierMap, pool: ConstantPool, table: number[]) {
    debug('generating data segment');

    let externalModuleTable = this.generateExternalModuleTable(map);
    let constantPool = this.generateConstantPool(pool);
    let heapTable = this.generateHeapTable(table);
    let specifierMap = this.generateSpecifierMap(map);
    let symbolTables = this.generateSymbolTables();

    let source = `
${externalModuleTable}
${heapTable}
${constantPool}
${specifierMap}
${symbolTables}

export default { moduleTable, heapTable, pool, specifierMap, symbolTables };`
    debug('generated data segment; source=%s', source);

    return source;
  }

  generateSymbolTables() {
    let symbolTables: Dict<SymbolTable> = {};
    let project = this.project;

    for (let [specifier, table] of this.specifiersToSymbolTable) {
      let muSpecifier = expect(
        project.specifierForPath(specifier.module),
        `expected to have an MU specifier for module ${specifier.module}`
      );
      symbolTables[muSpecifier] = table;
    }

    return `const symbolTables = ${inlineJSON(symbolTables)};`;
  }

  generateSpecifierMap(map: SpecifierMap) {
    let project = this.project;

    let entries = Array.from(map.vmHandleBySpecifier.entries());
    let specifierMap: Dict<number> = {};

    for (let [specifier, handle] of entries) {
      let muSpecifier = expect(
        project.specifierForPath(specifier.module),
        `expected to have a MU specifier for module ${specifier.module}`);
      specifierMap[muSpecifier] = handle;
    }
    
    return `const specifierMap = ${inlineJSON(specifierMap)};`;
  }

  generateHeapTable(table: number[]) {
    return `
const heapTable = ${inlineJSON(table)};
`
  }

  generateConstantPool(pool: ConstantPool) {
    return `
const pool = ${inlineJSON(pool)};
`;
  }

  generateExternalModuleTable(map: SpecifierMap) {
    let project = this.project;

    // First, convert the map into an array of specifiers, using the handle
    // as the index.
    let modules = toSparseArray(map.byHandle)
      .map(normalizeModulePaths)
      .filter(m => m) as Specifier[];

    let source = generateExternalModuleTable(modules);

    return source;

    function normalizeModulePaths(moduleSpecifier: Specifier) {
      let specifier = expect(project.specifierForPath(moduleSpecifier.module), `expected specifier for path ${moduleSpecifier.module}`);
      debug('resolved MU specifier; specifier=%s', specifier);

      let [type] = specifier.split(':');

      switch (type) {
        case 'template':
          return getComponentImport(specifier);
        case 'helper':
          return moduleSpecifier;
        default:
          throw new Error(`Unsupported type in specifier map: ${type}`);
      }
    }

    function getComponentImport(referrer: string): Specifier | null {
      let componentSpec = project.resolver.identify('component:', referrer);
      if (componentSpec) {
        let componentPath = project.pathForSpecifier(componentSpec)!;
        debug('found corresponding component; referrer=%s; path=%s', referrer, componentPath);
        return specifierFor(componentPath, 'default');
      }

      debug('no component for template; referrer=%s', referrer);
      return null;
    }
  }

  hasModifierInScope(_modifierName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
};

function generateExternalModuleTable(modules: Specifier[]) {
  let { imports, identifiers } = getImportStatements(modules);

  return `
${imports.join('\n')}

const moduleTable = [${identifiers.join(',')}];
`;
}

function inlineJSON(data: any) {
  return `JSON.parse(${JSON.stringify(JSON.stringify(data))})`;
}

function toSparseArray<T>(map: Map<number, T>): T[] {
  let array: T[] = [];

  for (let [key, value] of map) {
    array[key] = value;
  }

  return array;
}