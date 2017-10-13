import { SpecifierMap, Specifier } from "@glimmer/bundle-compiler";
import { dict, Dict } from '@glimmer/util';
import { Source, RawSource } from 'webpack-sources';
import { join, basename, dirname, relative } from 'path';

export default class ExternalModuleTable {
  constructor(private map: SpecifierMap, private options: { mode?: string, inputPath?: string } = {}) {}

  toSource(relativePath: string): Source {
    let modules: Specifier[] = [];

    this.map.byHandle.forEach((specifier, handle) => {
      modules[handle] = specifier;
    });

    let seen = dict<string>();
    let identifiers = new Array<string>(modules.length).fill('');

    let imports = modules.map(({ module, name }, i) => {
      let id = getIdentifier(seen, module);
      let importClause = getImportClause(name, id);

      let moduleSpecifier;
      if (this.options.mode === 'module-unification') {
        let inputPath = this.options.inputPath!;
        let cwd = process.cwd();
        console.log({ inputPath, relativePath, cwd, module});
        let tablePath = join(cwd, relativePath);
        let modulePath = join(cwd, module);
        console.log({ tablePath, modulePath });
        moduleSpecifier = getModuleSpecifier(tablePath, modulePath);
        console.log('ModuleSpec ->', moduleSpecifier)
      } else {
        moduleSpecifier = getModuleSpecifier(relativePath, module);
      }

      identifiers[i] = id;

      return `import ${importClause} from ${moduleSpecifier};`
    }).join('\n');

    let source = `${imports}

const EXTERNAL_MODULE_TABLE = [${identifiers.join(',')}];

export default EXTERNAL_MODULE_TABLE;
`;
    return new RawSource(source);
  }
}

function getModuleSpecifier(from: string, to: string): string {
  let basedir = dirname(from);
  let target = join(dirname(to), basename(to));
  let specifier = relative(basedir, target);

  return JSON.stringify(`./${specifier}`);
}

function getImportClause(name: string, id: string) {
  return (name === 'default') ? id : `{ ${name} as ${id} }`;
}

/**
 * Generates a valid, unique JavaScript identifier for a module path.
 *
 * @param {array} seen an array of identifiers used in this scope
 * @param {string} modulePath the module path
 * @returns {string} identifier a valid JavaScript identifier
 */
function getIdentifier(seen: Dict<string>, modulePath: string) {
  let identifier = modulePath
      // replace any non letter, non-number, non-underscore
      .replace(/[\W]/g, '_');

  // if we have already generated this identifier
  // prefix with an _ until we find a unique one
  while (seen[identifier]) {
    identifier = `_${identifier}`;
  }

  seen[identifier] = modulePath;

  return `__${identifier}__`;
}
