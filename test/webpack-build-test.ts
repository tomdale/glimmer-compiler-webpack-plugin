import { expect } from "chai";

import webpack = require("webpack");
import { dirSync as tmpdir } from "tmp";
import * as path from "path";

describe("module unification", function() {
  this.timeout(5000);

  it("compiles the data segment and binary bytecode", async function() {
    const { outputPath } = await buildWithWebpack("./fixtures/module-unification/webpack.config.js");

    let bundlePath = path.join(outputPath, "bundle.js");
    let bundle = require(bundlePath).default;

    // A table is a tracking object for the buffer and should be divisble by 4
    // Each segment represents how many items where compiled into the buffer
    expect(bundle.heap.table.length % 2).to.equal(0, 'heap divisible by 2');
    expect(bundle.table.length).to.equal(5, 'table length');
    expect(bundle.pool.strings.sort()).to.deep.equal(
      [
        "div",
        "OtherComponent ",
        "h1",
        "UserNav ",
        "wat",
        "\n",
        "\n  Yo yo "
      ].sort(),
    'string pool');

    expect(sortedKeys(bundle.map)).to.deep.equal([
      "template:/such-webpack/components/DropDown",
      "template:/such-webpack/components/Main",
      "template:/such-webpack/components/OtherComponent",
      "template:/such-webpack/components/UserNav"
    ]);

    expect(sortedValues(bundle.map)).to.deep.equal([2, 4, 6, 8]);

    expect(bundle.symbols).to.deep.equal({
      "template:/such-webpack/components/DropDown": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/OtherComponent": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/Main": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/UserNav": {
        hasEval: false,
        symbols: []
      }
    });
  });

  it("works with module concatenation optimization", async function() {
    const { outputPath } = await buildWithWebpack("./fixtures/module-unification/webpack.concatenation.config.js");

    let bundlePath = path.join(outputPath, "bundle.js");
    let bundle = require(bundlePath).default;

    // A table is a tracking object for the buffer and should be divisble by 4
    // Each segment represents how many items where compiled into the buffer
    expect(bundle.heap.table.length % 2).to.equal(0, 'heap divisible by 2');
    expect(bundle.table.length).to.equal(5, 'table length');
    expect(bundle.pool.strings.sort()).to.deep.equal(
      [
        "div",
        "OtherComponent ",
        "h1",
        "UserNav ",
        "wat",
        "\n",
        "\n  Yo yo "
      ].sort(),
    'string pool');

    expect(sortedKeys(bundle.map)).to.deep.equal([
      "template:/such-webpack/components/DropDown",
      "template:/such-webpack/components/Main",
      "template:/such-webpack/components/OtherComponent",
      "template:/such-webpack/components/UserNav"
    ]);

    expect(sortedValues(bundle.map)).to.deep.equal([2, 4, 6, 8]);

    expect(bundle.symbols).to.deep.equal({
      "template:/such-webpack/components/DropDown": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/OtherComponent": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/Main": {
        hasEval: false,
        symbols: []
      },
      "template:/such-webpack/components/UserNav": {
        hasEval: false,
        symbols: []
      }
    });
  });

  it("reports compiler errors", async function() {
    try {
      await buildWithWebpack("./fixtures/with-errors/webpack.config.js");
    } catch (err) {
      expect(err.message).to.match(/Cannot find component NonexistentComponent/);
    }
  });
});

async function buildWithWebpack(configPath: string): Promise<{ outputPath: string, stats: webpack.Stats }> {
  let config = require(configPath);
  let outputPath = (config.output.path = tmpdir().name);

  return new Promise<{ outputPath: string, stats: webpack.Stats }>((resolve, reject) => {
    webpack(config).run((err, stats) => {
      if (err) {
        reject(err);
      } else if (stats.hasErrors()) {
        reject(new Error(stats.toString()));
      } else {
        resolve({ outputPath, stats });
      }
    });
  });
}

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
