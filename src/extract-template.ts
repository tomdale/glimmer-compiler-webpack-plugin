import { parse } from 'babylon';
import { transform } from 'babel-core';
import traverse, { NodePath } from 'babel-traverse';
import { dirname, resolve, relative } from 'path';
import { PluginObj } from 'babel-core';
import { ImportDeclaration } from 'babel-types';
import * as types from 'babel-types';

interface PluginState {
  localBinding: types.Identifier;
}

interface ExtractionResult {
  template: string;
  code: string;
}

interface Scope {
  [key: string]: string;
}

export default function extractTemplate(source: string) {
  let template: string | null = null;

  let scope: Scope = {};

  let { code } = transform(source, {
    plugins: ['syntax-class-properties', ExtractTemplatePlugin]
  });

  return { template, scope, code };

  function ExtractTemplatePlugin(babel: any): PluginObj<PluginState> {
    const { types: t }: { types: typeof types } = babel;

    return {
      name: 'extract-template-babel-plugin',

      visitor: {
        ExportDefaultDeclaration(path) {
          let declaration = path.node.declaration;

          if (!t.isClassDeclaration(declaration)) { return; }

          path.get('declaration').traverse({
            ClassProperty(path) {
              let node = path.node;
              if (!(node as any).static) { return; }

              if (t.isIdentifier(node.key, { name: 'template' })) {
                let value = path.get('value');
                template = extractNodeValue(path.get('value'));
                path.remove();
              }
            }
          });
        },

        ImportDefaultSpecifier(path) {
          let local = path.node.local.name;
          let source = (path.parentPath.node as types.ImportDeclaration).source.value;
          scope[local] = source;
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
