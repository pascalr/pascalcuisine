const assert = require("assert/strict");
const { parse } = require("../src/parser.js");
const { tokenize } = require("../src/tokenizer.js");
const { describe, it } = require("minispec");
module.exports = () => {
  describe("Parse operation", function () {
    it("1 + 2", function () {
      let list = parse(tokenize("1+2").children);
      assert.equal(list?.length, 1);
      let ast = list[0];
      assert.equal(ast?.raw, "+");
      assert.equal(ast?.operands?.[0]?.raw, "1");
      assert.equal(ast?.operands?.[1]?.raw, "2");
    });

    it("2 + 3 * 4 + 5 == 19", function () {
      let list = parse(tokenize("2 + 3 * 4 + 5 == 19").children);
      assert.equal(list?.length, 1);
      let ast = list[0];
      assert.equal(ast?.raw, "==");
      assert.equal(ast?.operands?.[0]?.raw, "+");
      assert.equal(ast?.operands?.[0]?.operands?.[0]?.raw, "+");
      assert.equal(ast?.operands?.[0]?.operands?.[0]?.operands?.[0]?.raw, "2");
      assert.equal(ast?.operands?.[0]?.operands?.[0]?.operands?.[1]?.raw, "*");
      assert.equal(
        ast?.operands?.[0]?.operands?.[0]?.operands?.[1]?.operands?.[0]?.raw,
        "3",
      );
      assert.equal(
        ast?.operands?.[0]?.operands?.[0]?.operands?.[1]?.operands?.[1]?.raw,
        "4",
      );
      assert.equal(ast?.operands?.[0]?.operands?.[1]?.raw, "5");
      assert.equal(ast?.operands?.[1]?.raw, "19");
    });
  });

  function assertSameLength(actual, expected, msg) {
    if (actual.length !== expected.length) {
      let a = JSON.stringify(actual.map((p) => p.type));
      let e = JSON.stringify(expected.map((p) => p.type));
      assert.equal(a, e, msg);
    }
  }

  function validatePart(part, expected, msg) {
    if (expected.type) {
      assert.equal(part.type, expected.type, msg);
    }
    if (expected.value) {
      assert.equal(part.value, expected.value);
    }
    if (expected.parts) {
      assertSameLength(part.parts, expected.parts, msg + ".parts");
      expected.parts.forEach(function (e, i) {
        validatePart(part.parts[i], e, msg + `.parts[${i}]`);
      });
    }
    if (expected.operands) {
      assert.equal(
        part.operands.length,
        expected.operands.length,
        msg + ".operands.length",
      );
      expected.operands.forEach(function (e, i) {
        validatePart(part.operands[i], e, msg + `.operands[${i}]`);
      });
    }
  }

  function testParse(code, expected) {
    let list = parse(tokenize(code).children);
    assertSameLength(list, expected, "Number of expressions");
    expected.forEach(function (e, i) {
      validatePart(list[i], e, `Expression[${i}]`);
    });
  }

  describe("Parse let assignment", function () {
    it("let x", function () {
      testParse("let x", [
        {
          type: "DECLARATION",
          parts: [{ type: "KEYWORD_DECLARATION" }, { type: "VARIABLE" }],
        },
      ]);
    });

    it("let x;", function () {
      testParse("let x;", [
        {
          type: "DECLARATION",
          parts: [{ type: "KEYWORD_DECLARATION" }, { type: "VARIABLE" }],
        },
        { type: "punctuation.terminator.statement.jome" },
      ]);
    });

    it("let x; let y", function () {
      let list = parse(tokenize("let x; let y").children);
      assert.equal(list?.length, 3);
      assert.equal(list[0]?.raw, "let x");
      assert.match(list[2]?.raw, /let y/);
    });

    it("[1][0]", function () {
      let list = parse(tokenize("[1][0]").children);
      assert.equal(list?.length, 1);
      let ast = list[0];
      assert.equal(ast?.parts?.length, 3);
      assert.equal(ast?.operands?.length, 1);
      assert.equal(ast?.operands?.[0]?.parts?.length, 3);
    });
  });

  describe("Other", function () {
    it("!true === !false", function () {
      testParse("!true === !false", [
        {
          type: "keyword.operator.comparison.jome",
          operands: [
            {
              type: "keyword.operator.logical.unary.jome",
              operands: ["constant.language.boolean.jome"],
            },
            {
              type: "keyword.operator.logical.unary.jome",
              operands: ["constant.language.boolean.jome"],
            },
          ],
        },
      ]);
    });
  });
};
