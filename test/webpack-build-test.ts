import { expect } from 'chai';

import webpack = require('webpack');
import { dirSync as tmpdir } from 'tmp';
import { readFileSync } from 'fs';
import * as path from 'path';

describe('component loader', () => {

  it('produces a compiled template file from component files', (done) => {
    let config = require('./fixtures/basic/webpack.config.js');
    config.output.path = tmpdir().name;

    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else if (stats.hasErrors()) {
        done(new Error(stats.toString()));
      } else {
        let compiledTemplates = JSON.parse(readFileSync(path.join(config.output.path, 'templates.gbx')).toString());
        expect(compiledTemplates).to.deep.equal([
          25,1,0,0,31,0,0,0,22,2,0,0,32,0,0,0,20,0,0,0,25,3,0,0,31,0,0,0,22,4,0,0,32,0,0,0,20,0,0,0
        ]);
        done();
      }
    });
  });

});
