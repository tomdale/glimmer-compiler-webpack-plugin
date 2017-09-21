import { SpecifierMap, Specifier } from "@glimmer/bundle-compiler";
import { dict, Dict } from '@glimmer/util';
import { Source, RawSource } from 'webpack-sources';

export default class ExternalModuleTable {
  constructor(private map: SpecifierMap) {}

  toSource(): Source {
    let modules: Specifier[] = [];

    this.map.bySpecifier.forEach((handle, specifier) => {
      modules[handle] = specifier;
    });

    let seen = dict<string>();

    let imports = modules.map(({ module, name }) => {
      let id = getIdentifier(seen, module);
      let importClause = name === 'default' ? id : `{ ${name} as ${id} }`;
      return `import ${importClause} from ${JSON.stringify(module)};`
    }).join('\n');

    let identifiers = Object.keys(seen);

    let source = `${imports}

const EXTERNAL_MODULE_TABLE = [${identifiers.join(',')}];
`;
    return new RawSource(source);
  }
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
