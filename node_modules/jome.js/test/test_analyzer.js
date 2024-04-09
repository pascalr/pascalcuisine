const assert = require("assert/strict");
const { analyzeCode } = require("../src/compiler.js");
const { describe, it } = require("minispec");
module.exports = () => {
  function analyzeCodeGetBinding(code, bindingName) {
    let ctxFile = analyzeCode(code);
    return ctxFile.lexEnv.getBinding(bindingName);
  }

  describe("Incomplete statements", function () {
    it("should return an error keyword let with nothing else", function () {
      let ctxFile = analyzeCode("let");
      assert.equal(ctxFile.errors.length, 1);
    });
    it("should return an error keyword import with nothing else", function () {
      let ctxFile = analyzeCode("import");
      assert.equal(ctxFile.errors.length, 1);
    });
  });

  describe("Declaration should add to the lexical environment", function () {
    it("let should add to the lexical environment", function () {
      assert(analyzeCodeGetBinding("let x", "x"));
    });
    it("import should add to the lexical environment", function () {
      assert(analyzeCodeGetBinding("import name from 'file'", "name"));
    });
    it("def should add to the lexical environment", function () {
      assert(analyzeCodeGetBinding("def add(x, y) return x + y end", "add"));
    });
  });

  describe("The bindings should have the good variableType when specified", function () {
    it("int x", function () {
      let binding = analyzeCodeGetBinding("int x", "x");
      assert.equal(binding.variableType, "int");
    });
    it("let x : int", function () {
      let binding = analyzeCodeGetBinding("let x : int", "x");
      assert.equal(binding.variableType, "int");
    });
  });

  describe("The bindings should have the good variableType implicitely detected when possible", function () {
    it("let x = 43", function () {
      let binding = analyzeCodeGetBinding("let x = 43", "x");
      assert.equal(binding.variableType, "int");
    });
    it("let x = true", function () {
      let binding = analyzeCodeGetBinding("let x = true", "x");
      assert.equal(binding.variableType, "bool");
    });
    it("let x = 2.0", function () {
      let binding = analyzeCodeGetBinding("let x = 2.0", "x");
      assert.equal(binding.variableType, "float");
    });
    it('let x = "hello"', function () {
      let binding = analyzeCodeGetBinding('let x = "hello"', "x");
      assert.equal(binding.variableType, "string");
    });
  });
};
