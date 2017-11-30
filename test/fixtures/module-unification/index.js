import Application, { BytecodeLoader, SyncRenderer } from '@glimmer/application';
import { StringBuilder } from '@glimmer/ssr';
import * as SimpleDOM from 'simple-dom';
import Resolver, { BasicModuleRegistry } from '@glimmer/resolver';
import { ComponentManager } from '@glimmer/component';
import data from './table';
import { join } from 'path';
import { readFileSync } from 'fs';

let doc = new SimpleDOM.Document();

let nodeBuffer = readFileSync(join(__dirname, './templates.gbx'));
let bytecode = new ArrayBuffer(nodeBuffer.length);
let bytes = new Uint8Array(bytecode);
bytes.set(nodeBuffer);

const MODULE_CONFIG = {
  app: {
    rootName: 'such-webpack',
    name: 'such-webpack'
  },
  types: {
    application: { definitiveCollection: 'main' },
    component: { definitiveCollection: 'components' },
    helper: { definitiveCollection: 'components' },
    renderer: { definitiveCollection: 'main' },
    template: { definitiveCollection: 'components' },
    stylesheet: { definitiveCollection: 'components' }
  },
  collections: {
    main: {
      types: ['application', 'renderer']
    },
    components: {
      group: 'ui',
      types: ['component', 'template', 'helper', 'stylesheet'],
      defaultType: 'component',
      privateCollections: ['utils']
    },
    styles: {
      group: 'ui',
      unresolvable: true
    },
    utils: {
      unresolvable: true
    }
  }
};

let app = new Application({
  loader: new BytecodeLoader({ bytecode, data }),
  builder: new StringBuilder({ element: doc.body, nextSibling: null }),
  renderer: new SyncRenderer(),
  resolver: new Resolver(MODULE_CONFIG, new BasicModuleRegistry(data.meta)),
  rootName: 'such-webpack',
  document: doc,
});

app.registerInitializer({
  initialize(registry) {
    registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
  }
});

app.renderComponent('Entry', doc.body, null);

export function render() {
  return app.boot().then(() => {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    return serializer.serialize(doc.body);
  });
}
