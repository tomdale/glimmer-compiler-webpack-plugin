import * as Babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as types from 'babel-types';
import { expect, Dict } from '@glimmer/util';
import { ModuleLocator } from '@glimmer/bundle-compiler';

type Scope = Dict<ModuleLocator>;

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
  let { code } = Babel.transform(source, { plugins: [
    // We rely on not-yet-standardized class property syntax, which requires a
    // Babel syntax plugin.
    require('babel-plugin-syntax-class-properties').default,
    require('babel-plugin-syntax-typescript').default,
    require('babel-plugin-syntax-decorators').default,
    ExtractTemplate(pluginResult)
  ] });

  let { template, scope } = pluginResult;

  scope = expect(scope, 'could not build scope for template');
  code = expect(code, 'could not remove template from JavaScript source');

  return { template, scope, code };
}

/**
 * Factory function for the Babel plugin that closes over the passed result.
 * Because there's no good way for a Babel plugin to pass results, we instead
 * allow the caller to pass in a result object that gets mutated during
 * traversal.
 */
function ExtractTemplate(result: PluginResult) {
  return function(babel: typeof Babel): babel.PluginObj<PluginState> {
    const { types: t }: { types: typeof types } = babel;

    return {
      name: 'extract-template-babel-plugin',

      visitor: {
        // Look for the file's default export. We only attempt to extract
        // templates from default exports that are classes.
        ExportDefaultDeclaration(path) {
          let declaration = path.node.declaration;

          if (!t.isClassDeclaration(declaration)) { return; }

          // Look for a static class property called `template`
          path.get('declaration').traverse({
            ClassProperty(path) {
              let node = path.node;
              if (!(node as any).static) { return; }

              if (t.isIdentifier(node.key, { name: 'template' })) {
                // Extract the string value from property and set it on the
                // closed-over result. This is abstracted into a function
                // because extracting the value will differ a little bit between
                // e.g. string literals, template literals, tagged templates,
                // etc.
                result.template = extractNodeValue(path.get('value'));

                // Remove the property value path so that the template gets
                // removed from the transformed JavaScript. Note that this is
                // removing the value, not the property declaration itself, so
                // the static `template` property will still appear in the
                // class, just not initialized to any value.
                path.remove();
              }
            }
          });
        },

        // Scan the file for any named or default imports and capture them in
        // the result's scope data structure. This allows us to approximately
        // recreate the lexical scope of the template during compilation.
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
