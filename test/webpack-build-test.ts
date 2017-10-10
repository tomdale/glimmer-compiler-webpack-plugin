import { expect } from 'chai';

import webpack = require('webpack');
import { dirSync as tmpdir } from 'tmp';
import { readFileSync } from 'fs';
import * as path from 'path';

describe('component loader', () => {

  it('produces a compiled template file from component files', function(done) {
    this.timeout(5000);
    let config = require('./fixtures/basic/webpack.config.js');
    config.output.path = tmpdir().name;

    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else if (stats.hasErrors()) {
        done(new Error(stats.toString()));
      } else {
        let binaryOutput = readFileSync(path.join(config.output.path, 'templates.gbx'));
        let compiledTemplates = new Uint16Array(binaryOutput);

        expect(Array.from(compiledTemplates)).to.deep.equal(
          [25, 1, 0, 0, 31, 0, 22, 1, 1, 0, 32, 0, 20, 0, 25, 1, 2, 0, 31, 0, 22, 1, 3, 0, 32, 0, 20, 0]
        );
        done();
      }
    });
  });

});
