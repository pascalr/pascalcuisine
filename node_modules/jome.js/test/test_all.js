const test_compiler = require("./test_compiler.js");
const test_analyzer = require("./test_analyzer.js");
const test_parser = require("./test_parser.js");
const j_uid_1 = require("minispec");
const { default: MiniSpec, describe, it } = j_uid_1;
module.exports = () => {
  test_parser();

  test_compiler();

  test_analyzer();

  MiniSpec.execute();
};
