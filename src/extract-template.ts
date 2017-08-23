import * as Babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as types from 'babel-types';
import Scope from './scope';
import { expect } from '@glimmer/util';

interface PluginState {
  localBinding: types.Identifier;
}

interface PluginResult {
  template: string | null;
  scope: Scope;
}

/**
 * The result of extracting a template from a source file. The result contains
 * the extracted template, the modified source with the embedded template
 * removed, and a set of imports in scope for the template.
 */
interface ExtractionResult {
  template: string | null;
  scope: Scope;
  code: string;
}

/**
 * Extracts a template from a single-file component. Given a string of source
 * code, it will return a result containing the extracted template, the modified
 * source code with the embedded template removed, and a scope object containing
 * all of the imports in scope for that template.
 */
export default function extractTemplate(source: string): ExtractionResult {
  let pluginResult: PluginResult = { template: null, scope: {} };
  let { code } = Babel.transform(source, { plugins: [ExtractTemplate(pluginResult)] });

  let { template, scope } = pluginResult;

  scope = expect(scope, 'could not build scope for template');
  code = expect(code, 'could not remove template from JavaScript source');

  return { template, scope, code };
}

function ExtractTemplate(result: PluginResult) {
  return function(babel: typeof Babel): babel.PluginObj<PluginState> {
    const { types: t }: { types: typeof types } = babel;

    return {
      name: 'extract-template-babel-plugin',
      inherits: require('babel-plugin-syntax-class-properties').default,

      visitor: {
        ExportDefaultDeclaration(path) {
          let declaration = path.node.declaration;

          if (!t.isClassDeclaration(declaration)) { return; }

          path.get('declaration').traverse({
            ClassProperty(path) {
              let node = path.node;
              if (!(node as any).static) { return; }

              if (t.isIdentifier(node.key, { name: 'template' })) {
                result.template = extractNodeValue(path.get('value'));
                path.remove();
              }
            }
          });
        },

        ImportDefaultSpecifier(path) {
          let local = path.node.local.name;
          let module = (path.parentPath.node as types.ImportDeclaration).source.value;
          result.scope[local] = { name: 'default', module };
        },

        ImportSpecifier(path) {
          let local = path.node.local.name;
          let imported = path.node.imported.name;
          let module = (path.parentPath.node as types.ImportDeclaration).source.value;

          result.scope[local] = { name: imported, module };
        }
      }
    };

    function extractNodeValue(path: NodePath) {
      let node = path.node;

      if (t.isStringLiteral(node)) {
        return node.value;
      }

      if (t.isTemplateLiteral(node)) {
        if (node.expressions.length) {
          throw path.buildCodeFrameError(`interpolated values inside a component's template are not supported`);
        }

        return node.quasis[0].value.cooked;
      }

      throw path.buildCodeFrameError('Unsupported template format');
    }
  }
}