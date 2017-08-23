import { expect } from 'chai';
import extractTemplate from '../src/extract-template';
import deindent from './helpers/deindent';

describe('extracting templates', () => {

  it('extracts templates in quotes', () => {
    let { code, template } = extractTemplate(deindent`
      import Component, { tracked } from '@glimmer/component';
      export default class extends Component {
        didInsertElement() {
        }
        static template = "<h1>hello world</h1>";
      }
    `);

    expect(code).to.equal(deindent`
      import Component, { tracked } from '@glimmer/component';
      export default class extends Component {
        didInsertElement() {}

      }
    `);

    expect(template).to.equal(`<h1>hello world</h1>`);
  });

  it('extracts templates in template literals', () => {
    let { code, template } = extractTemplate(deindent`
      import Component, { tracked } from '@glimmer/component';
      export default class extends Component {
        didInsertElement() {
        }
        static template = \`<h1>hello world</h1>\`;
      }
    `.trim());

    expect(code).to.equal(deindent`
      import Component, { tracked } from '@glimmer/component';
      export default class extends Component {
        didInsertElement() {}

      }
    `);

    expect(template).to.equal(`<h1>hello world</h1>`);
  });

  it('extracts exports', () => {
    let { scope } = extractTemplate(`
      import Component, { tracked } from '@glimmer/component';
      export default class extends Component {
        didInsertElement() {
        }
        static template = \`<h1>hello world</h1>\`;
      }
      import { expect as expectValue, unwrap } from '@glimmer/util';
      import Application from '@glimmer/application';
      import OtherComponent from './other-component';
    `);

    expect(scope).to.deep.equal({
      Component: { name: 'default', module: '@glimmer/component' },
      tracked: { name: 'tracked', module: '@glimmer/component' },
      expectValue: { name: 'expect', module: '@glimmer/util' },
      unwrap: { name: 'unwrap', module: '@glimmer/util' },
      Application: { name: 'default', module: '@glimmer/application' },
      OtherComponent: { name: 'default', module: './other-component' }
    });
  });

});