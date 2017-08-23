import GlimmerCompiler = require('../src');
import extractTemplate from '../src/extract-template';
import webpack = require('webpack');

describe('component loader', () => {

  it('strips Handlebars templates', () => {
    const source = `
    import Component, { hbs } from '@glimmer/component';
    export default class extends Component {
      static template = "<h1>hello world</h1>";
    }
    `;
  });

  it('strips templates from component files', (done) => {
    let config = require('./fixtures/webpack.config.js');
    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

});
