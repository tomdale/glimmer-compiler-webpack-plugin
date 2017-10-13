import { CompilerDelegate, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { basename, extname, relative, join } from 'path';
import { Project } from 'glimmer-analyzer';
import { CompilableTemplate, CompileOptions } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';

function getTemplateSpecifier(relativePath: string, projectPath: string, rootName: string) {
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

  return `template:/${rootName}/${pathParts.join('/')}`;
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

const BUILTINS = ['action', 'if'];

export default class ModuleUnificationDelegate implements CompilerDelegate {
  protected project: Project;
  protected rootName: string;

  constructor(protected projectPath: string) {
    this.project = new Project(projectPath);
    this.rootName = this.project.rootName;
  }

  hasComponentInScope(name: string, referrer: Specifier) {
    console.log('hasComponentInScope', { name, referrer });
    let referrerSpec = getTemplateSpecifier(referrer.module, this.projectPath, this.rootName);

    let resolved = this.project.resolver.identify(`template:${name}`, referrerSpec);
    if (resolved) {
      console.log(' ->', true);
      return true;
    }

    console.log(' ->', false);
    return false;
  }

  resolveComponentSpecifier(name: string, referrer: Specifier) {
    console.log('resolveComponentSpecifier', { name, referrer });

    let referrerSpec = getTemplateSpecifier(referrer.module, this.projectPath, this.rootName);
    let resolved = this.project.resolver.identify(`template:${name}`, referrerSpec);

    let resolvedSpecifier = this.getCompilerSpecifier(resolved);
    console.log('  ->', resolvedSpecifier);
    return resolvedSpecifier;
  }

  protected getCompilerSpecifier(specifier: string): Specifier {
    let { projectPath, rootName } = this;
    let [, path] = specifier.split(':');

    let cwd = process.cwd();
    console.log({ specifier, cwd, rootName });

    path = path.replace(rootName, 'src/ui');
    path = join(projectPath, path);
    path = relative(process.cwd(), path);
    path = `./${path}/template.hbs`;
    console.log({ path });
    return specifierFor(path, 'default');
  }

  getComponentCapabilities() {
    return CAPABILITIES;
  }
  hasHelperInScope(helperName: string, referrer: Specifier) {
    if (BUILTINS.indexOf(helperName) > -1) { return true; }

    let referrerSpec = referrer ? getTemplateSpecifier(referrer.module, this.projectPath, this.rootName) : undefined;
    return !!this.project.resolver.identify(`helper:${helperName}`, referrerSpec);
  }
  resolveHelperSpecifier(helperName: string, _referrer: Specifier) {
    return specifierFor(`./packages/glimmer/src/ui/components/${helperName}/helper.ts`, 'default');
  }

  getComponentLayout(specifier: Specifier, block: SerializedTemplateBlock, options: CompileOptions<Specifier>) {
    console.log('getComponentLayout', { specifier, block });

    let compiled = CompilableTemplate.topLevel(block, options);
    return compiled;
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
