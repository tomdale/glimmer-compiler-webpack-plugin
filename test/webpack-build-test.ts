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
    let outputPath = config.output.path = tmpdir().name;

    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else if (stats.hasErrors()) {
        done(new Error(stats.toString()));
      } else {
        let bundlePath = path.join(outputPath, 'bundle.js');
        let bundle = require(bundlePath).default;

        // A table is a tracking object for the buffer and should be divisble by 4
        // Each segment represents how many items where compiled into the buffer
        expect(bundle.heapTable.length / 2).to.equal(3);

        expect(bundle.moduleTable.length).to.equal(3);
        expect(bundle.pool.strings.sort()).to.deep.equal([
          'div', 'OtherComponent ', 'h1', 'UserNav ', 'wat', '\n',
          '\n  Yo yo '
        ].sort());

        expect(sortedKeys(bundle.specifierMap)).to.deep.equal([
          'template:/such-webpack/components/DropDown',
          'template:/such-webpack/components/OtherComponent',
          'template:/such-webpack/components/UserNav'
        ]);

        expect(sortedValues(bundle.specifierMap)).to.deep.equal([
          0, 2, 4
        ]);

        expect(bundle.symbolTables).to.deep.equal({
          'template:/such-webpack/components/DropDown': {
            hasEval: false,
            referrer: null,
            symbols: []
          },
          'template:/such-webpack/components/OtherComponent': {
            hasEval: false,
            referrer: null,
            symbols: []
          },
          'template:/such-webpack/components/UserNav': {
            referrer: null
          }
        });

        done();
      }
    });
  });

});

function sortedKeys(obj: {}): string[] {
  return Object.keys(obj).sort();
}

function sortedValues(obj: { [s: string]: number }): number[] {
  let values: number[] = [];
  for (let key in obj) {
    values.push(obj[key]);
  }

  return values
    .sort((a, b) => a - b);
}
