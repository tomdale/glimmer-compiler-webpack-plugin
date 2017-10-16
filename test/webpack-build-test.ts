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
          [25,1,0,0,31,0,22,1,1,0,32,0,22,1,2,0,20,0,25,1,3,0,31,0,22,1,4,0,32,0,22,1,2,0,20,0]
        );
        done();
      }
    });
  });

  it('module unification', function(done) {
    this.timeout(5000);
    let config = require('./fixtures/module-unification/webpack.config.js');
    config.output.path = tmpdir().name;

    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else if (stats.hasErrors()) {
        done(new Error(stats.toString()));
      } else {
        let dataSegment = JSON.parse(readFileSync(path.join(config.output.path, 'templates.gbx.json'), 'utf8'));

        let out = dataSegment.pool.strings.sort();

        expect(out).to.deep.equal([
          'div', 'OtherComponent ', 'h1', 'UserNav ', 'wat', '\n',
          '\n  Yo yo '
        ].sort());

        let { EXTERNAL_MODULE_TABLE } = require(path.join(config.output.path, 'bundle.js')).default;
        expect(EXTERNAL_MODULE_TABLE.length).to.equal(2);

        // A table is a tracking object for the buffer and should be divisble by 4
        // Each segement represents how many items where compiled into the buffer
        expect(dataSegment.table.length / 4).to.equal(5);
        done();
      }
    });
  });

});
