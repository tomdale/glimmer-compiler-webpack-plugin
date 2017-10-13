import { CompilerDelegate, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { basename, extname, relative, join } from 'path';
import { Project } from 'glimmer-analyzer';
import { CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';
import { Dict } from '@glimmer/util';

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

const TYPE_MAP: Dict<string> = {
  'template': 'template.hbs',
  'helper': 'helper'
};

export default class ModuleUnificationDelegate implements CompilerDelegate {
  protected project: Project;
  protected rootName: string;

  constructor(protected projectPath: string) {
    this.project = new Project(projectPath);
    this.rootName = this.project.rootName;
  }

  hasComponentInScope(name: string, referrer: Specifier) {
    let referrerSpec = this.getModuleUnificationSpecifier(referrer.module);

    let resolved = this.project.resolver.identify(`template:${name}`, referrerSpec);
    if (resolved) {
      return true;
    }

    return false;
  }

  resolveComponentSpecifier(name: string, referrer: Specifier) {
    let referrerSpec = this.getModuleUnificationSpecifier(referrer.module);
    let resolved = this.project.resolver.identify(`template:${name}`, referrerSpec);

    let resolvedSpecifier = this.getCompilerSpecifier(resolved);
    return resolvedSpecifier;
  }

  protected getCompilerSpecifier(specifier: string): Specifier {
    let { projectPath, rootName } = this;
    let [type, path] = specifier.split(':');

    let cwd = process.cwd();
    path = path.replace(rootName, 'src/ui');
    path = join(projectPath, path);
    path = relative(cwd, path);
    path = `./${path}/${ TYPE_MAP[type] }`;
    return specifierFor(path, 'default');
  }

  protected getModuleUnificationSpecifier(relativePath: string, type: string = 'template') {
    let { projectPath, rootName } = this;
    relativePath = relative(projectPath, relativePath);

    let pathParts = relativePath.split('/');
    pathParts.shift();

    // TODO - should use module map config to be rigorous
    if (pathParts[pathParts.length - 1] === 'template.hbs') {
      pathParts.pop();
    }

    if (extname(pathParts[pathParts.length - 1]) === '.hbs') {
      let fileName = pathParts.pop();

      pathParts.push(basename(fileName!, '.hbs'));
    }

    if (pathParts[0] === 'ui') {
      pathParts.shift();
    }

    return `${type}:/${rootName}/${pathParts.join('/')}`;
  }

  getComponentCapabilities() {
    return CAPABILITIES;
  }

  hasHelperInScope(helperName: string, referrer: Specifier) {
    if (BUILTINS.indexOf(helperName) > -1) { return true; }

    let referrerSpec = referrer ? this.getModuleUnificationSpecifier(referrer.module) : undefined;
    return !!this.project.resolver.identify(`helper:${helperName}`, referrerSpec);
  }

  resolveHelperSpecifier(helperName: string, referrer: Specifier) {
    if (BUILTINS.indexOf(helperName) > -1) {
      return specifierFor('__BUILTIN__', helperName);
    }

    let referrerSpec = referrer ? this.getModuleUnificationSpecifier(referrer.module) : undefined;
    let resolvedSpec = this.project.resolver.identify(`helper:${helperName}`, referrerSpec);

    return this.getCompilerSpecifier(resolvedSpec);
  }

  getComponentLayout(_specifier: Specifier, block: SerializedTemplateBlock, options: CompileOptions<Specifier>) {
    return CompilableTemplate.topLevel(block, options);
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
