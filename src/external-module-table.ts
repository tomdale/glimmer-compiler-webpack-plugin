import { SpecifierMap, Specifier } from "@glimmer/bundle-compiler";
import { dict, Dict } from '@glimmer/util';
import { Source, RawSource } from 'webpack-sources';
import { join, basename, dirname, relative, extname } from 'path';
import { DataSegment } from "./bundle";
import { Project } from 'glimmer-analyzer';

export default class ExternalModuleTable {
  project: Project;
  rootName: string;
  projectPath: string;

  constructor(private map: SpecifierMap, protected dataSegment: DataSegment, private options: { mode?: string, inputPath?: string } = {}) {
    if (options.mode === 'module-unification') {
      this.project = new Project(options.inputPath!);
      this.rootName = this.project.rootName;
      this.projectPath = options.inputPath!;
    }
  }

  buildSpecifierTable() {
    let table = dict<number>();

    this.map.byHandle.forEach((specifier, handle) => {
      let muSpecifier = this.getMUSpecifier(specifier.module);
      table[muSpecifier] = handle;
    });

    return JSON.stringify(table);
  }

  getMUSpecifier(relativePath: string, type: string = 'template') {
    let { rootName, projectPath } = this;

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
        let cwd = process.cwd();
        let tablePath = join(cwd, relativePath);
        let modulePath = join(cwd, module);
        moduleSpecifier = getModuleSpecifier(tablePath, modulePath);
      } else {
        moduleSpecifier = getModuleSpecifier(relativePath, module);
      }

      identifiers[i] = id;

      return `import ${importClause} from ${moduleSpecifier};`
    }).join('\n');

    let source = `${imports}

const EXTERNAL_MODULE_TABLE = [${identifiers.join(',')}];

export default EXTERNAL_MODULE_TABLE;

export const SPECIFIER_MAP = ${JSON.stringify(this.buildSpecifierTable())};

export const DATA_SEGMENT = ${JSON.stringify(JSON.stringify(this.dataSegment))};
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
