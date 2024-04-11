const argv = require("./argv.js")
const build = require("./build.js")
const cjs = require("./cjs.js")
const compile = require("./compile.js")
const esm = require("./esm.js")
const execSh = require("./execSh.js")
const write = require("./write.js")
const formatting = require("./formatting.js")

// FIXME: The issue of doing it this way is that if two files export the same name, I would want to throw an exception,
// but right now it would simply fail silently by keeping only the second.

module.exports = {
  argv,
  execSh,
  ...write,
  build,
  ...cjs,
  compile,
  ...esm,
  ...formatting
}
