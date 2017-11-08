import { expect } from "chai";

import webpack = require("webpack");
import { dirSync as tmpdir } from "tmp";
import * as path from "path";

describe("component loader", () => {
  it("module unification", function(done) {
    this.timeout(5000);
    let config = require("./fixtures/module-unification/webpack.config.js");
    let outputPath = (config.output.path = tmpdir().name);

    webpack(config).run((err, stats) => {
      if (err) {
        done(err);
      } else if (stats.hasErrors()) {
        done(new Error(stats.toString()));
      } else {
        let bundlePath = path.join(outputPath, "bundle.js");
        let bundle = require(bundlePath).default;

        // A table is a tracking object for the buffer and should be divisble by 4
        // Each segment represents how many items where compiled into the buffer
        expect(bundle.heap.table.length / 2).to.equal(4);

        expect(bundle.table.length).to.equal(4);
        expect(bundle.pool.strings.sort()).to.deep.equal(
          [
            "div",
            "OtherComponent ",
            "h1",
            "UserNav ",
            "wat",
            "\n",
            "\n  Yo yo "
          ].sort()
        );

        expect(sortedKeys(bundle.map)).to.deep.equal([
          "template:/such-webpack/components/DropDown",
          "template:/such-webpack/components/OtherComponent",
          "template:/such-webpack/components/UserNav"
        ]);

        expect(sortedValues(bundle.map)).to.deep.equal([2, 4, 6]);

        expect(bundle.symbols).to.deep.equal({
          "template:/such-webpack/components/DropDown": {
            hasEval: false,
            symbols: []
          },
          "template:/such-webpack/components/OtherComponent": {
            hasEval: false,
            symbols: []
          },
          "template:/such-webpack/components/UserNav": {
            hasEval: false,
            symbols: []
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

  return values.sort((a, b) => a - b);
}
