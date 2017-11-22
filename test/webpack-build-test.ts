import { expect } from "chai";

import webpack = require("webpack");
import { dirSync as tmpdir } from "tmp";
import * as path from "path";

describe("module unification", function() {
  this.timeout(10000);

  it("compiles the data segment and binary bytecode", async function() {
    const { outputPath } = await buildWithWebpack("./fixtures/module-unification/webpack.config.js");

    let bundlePath = path.join(outputPath, "bundle.js");
    let { render } = require(bundlePath);

    let html = await render();

    expect(html).to.equal(`<body>Hello, world!
<h1>UserNav wat</h1>
<!----></body>`);
  });

  it("allows plugins to rewrite template ASTs", async function() {
    const { outputPath } = await buildWithWebpack("./fixtures/module-unification/webpack.rewriter.config.js");

    let bundlePath = path.join(outputPath, "bundle.js");
    let { render } = require(bundlePath);

    let html = await render();

    expect(html).to.equal(`<body>Goodbye, universe!
<h1>UserNav wat</h1>
<!----></body>`);
  });

  it("works with module concatenation optimization", async function() {
    const { outputPath } = await buildWithWebpack("./fixtures/module-unification/webpack.concatenation.config.js");

    let bundlePath = path.join(outputPath, "bundle.js");
    let { render } = require(bundlePath);

    let html = await render();

    expect(html).to.equal(`<body>Hello, world!
<h1>UserNav wat</h1>
<!----></body>`);
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
