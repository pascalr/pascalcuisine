const assert = require("assert/strict");
const { compileCode } = require("../src/compiler.js");
const { describe, it } = require("minispec");
module.exports = () => {
  function compile(code) {
    return compileCode(code, { writeScript: false });
  }

  function testCompile(code, expectedResult) {
    return function () {
      assert.match(compile(code), expectedResult, "*** Compile mismatch ***");
    };
  }

  function assertCompile(code, expectedResult) {
    assert.match(compile(code), expectedResult, "*** Compile mismatch ***");
  }

  describe("Paths", function () {
    it("Dirname shortcuts", function () {
      assertCompile("#.", /__dirname/);
      assertCompile("#./", /__dirname/);
    });
    it("Absolute paths", function () {
      assertCompile("#/", /"\/"/);
      assertCompile("#/some/path.ext", /"\/some\/path\.ext"/);
    });
    it("Path relative to current file", function () {
      assertCompile(
        "#./some_file.ext",
        /path.join\(__dirname, "some_file\.ext"\)/,
      );
    });
    it("Path relative to the current working directory", function () {
      assertCompile(
        "#cwd/some_file.ext",
        /path.resolve\("\.\/some_file\.ext"\)/,
      );
    });
    it("Path in the current file parent folder", function () {
      assertCompile("#..", /path.join\(__dirname, ".."\)/);
      assertCompile("#../", /path.join\(__dirname, "..\/"\)/);
      assertCompile(
        "#../some_file.ext",
        /path.join\(__dirname, "..\/some_file\.ext"\)/,
      );
    });

    it.skip("Path in the home directory", function () {
      assertCompile("#~", /require\('os'\); os.homedir\(\)/);
      assertCompile("#~/", /require\('os'\); os.homedir\(\)/);
      assertCompile(
        "#~/some_file.ext",
        /require\('os'\); path.join\(os.homedir\(\), 'some_file.ext'\)/,
      );
    });
  });

  describe("Imports", function () {
    it("Default import Jome file", function () {
      assertCompile(
        'import execute from "execute.jome"',
        /const execute = require\("execute.js"\)/,
      );
    });
    it("Default import", function () {
      assertCompile(
        'import name from "module-name"',
        /const (\w+) = require\("module-name"\);\s*const name = \1.default;/,
      );
    });
    it("Star import", function () {
      assertCompile(
        'import * as name from "module-name"',
        /const name = require\("module-name"\)/,
      );
    });
    it("Deconstructed import", function () {
      assertCompile(
        'import { name } from "module-name"',
        /const { ?name ?} = require\("module-name"\)/,
      );
      assertCompile(
        'import { name, name2 } from "module-name"',
        /const { ?name, name2 ?} = require\("module-name"\)/,
      );
    });
    it("Alias deconstructed import", function () {
      assertCompile(
        'import { name as otherName } from "module-name"',
        /const { name: otherName } = require\("module-name"\)/,
      );
      assertCompile(
        'import { normal, name as otherName } from "module-name"',
        /const { normal, name: otherName } = require\("module-name"\)/,
      );
    });
    it("Alias deconstructed import with default", function () {
      assertCompile(
        'import def, { name as otherName } from "module-name"',
        /const (\w+) = require\("module-name"\);\s*const { ?default: def, name: otherName ?} = \1;/,
      );
    });

    it("Default import and deconstructed", function () {
      assertCompile(
        'import name, { foo } from "module-name"',
        /const (\w+) = require\("module-name"\);\s*const { ?default: name, foo ?} = \1;/,
      );
    });
    it("Default import and star import", function () {
      assertCompile(
        'import name, * as all from "module-name"',
        /const (\w+) = require\("module-name"\);\s*const { ?default: name, ...all ?} = \1;/,
      );
    });

    describe("Common JS imports", function () {
      it("Import all", function () {
        assertCompile(
          'import name of "module-name"',
          /const name = require\("module-name"\);/,
        );
      });
      it("Import deconstructed", function () {
        assertCompile(
          'import { foo, bar } of "module-name"',
          /const { ?foo, ?bar ?} = require\("module-name"\);/,
        );
      });
    });
  });

  describe("Strings", function () {
    it("Single quote strings", function () {
      assertCompile("'hello Éric'", /"hello Éric"/);
      assertCompile(
        "let code = 'if (cond) {return 0;}'",
        /let code = "if \(cond\) {return 0;}"/,
      );

      assertCompile(
        `'multi
    line'`,
        /`multi\s+line`/,
      );

      assertCompile("'\"hello\"'", /"\\"hello\\""/);

      assertCompile(
        `'multi \`line\`
    with backticks'`,
        /`multi \\`line\\`\s+with backticks`/,
      );
    });
    it("Regular double quote strings", function () {
      assertCompile('"hello"', /"hello"/);
      assertCompile('"Hello Éric!"', /"Hello Éric!"/);

      assertCompile(
        `"multi
    line"`,
        /`multi\s+line`/,
      );
      assertCompile('"Hello O\'Connor"', /"Hello O'Connor"/);

      assertCompile(
        `"multi \`line\`
    with backticks"`,
        /`multi \\`line\\`\s+with backticks`/,
      );
    });
    it.skip("Regular double quote strings with escaping", function () {});
    it("Double quote strings template literal", function () {
      assertCompile('"1 + 1 = {1+1}"', /`1 \+ 1 = \$\{1 ?\+ ?1\}`/);
    });
    it("Triple single quote strings", function () {
      assertCompile("'''Hello O'Connor'''", /"Hello O'Connor"/);
    });
  });

  describe("Regexes", function () {
    it("/test1212/", testCompile("/test1212/", /\/test1212\//));
  });

  describe("Heredocs", function () {
    it("<sh>ls</sh>", function () {
      assertCompile(
        "<sh>ls</sh>",
        /const execSh = require\("@jome\/core\/execSh"\);\s*execSh\("ls"\);/,
      );
    });
    describe("Heredoc percent syntax", function () {
      it('"ls"%sh', function () {
        assertCompile(
          '"ls"%sh',
          /const execSh = require\("@jome\/core\/execSh"\);\s*execSh\("ls"\);/,
        );
      });
    });
  });

  describe("Comments", function () {
    describe("Documentation comments", function () {
      it("Documentation comments should be compiled into js comments", function () {
        assertCompile("# documentation comment", /\/\/ documentation comment/);
      });
    });
  });

  describe("Test arrow call", function () {
    it("obj->call", function () {
      assertCompile("obj->call", /obj.call\(\)/);
    });
  });

  describe("Test function call", function () {
    it("Function call with parens", function () {
      assertCompile(
        `
let add = (x,y) => x + y
add(10, 5)
`,
        /\s*let add = \(x, ?y\) => \(?x \+ y\)?;?\s*add\(10, ?5\);?/,
      );
    });
    it("Function call without parens", function () {
      assertCompile(
        `
let add = (x,y) => x + y
add 10, 5
`,
        /\s*let add = \(x, ?y\) => \(?x \+ y\)?;?\s*add\(10, ?5\);?/,
      );
    });
    it("Function call without parens with entry", function () {
      assertCompile(
        `
let idle = (options) => 10
idle delay: 20
`,
        /\s*let idle = \(options\) => \(?10\)?;?\s*idle\(\{ ?delay: ?20 ?\}\);?/,
      );
    });
    it("Function call with shorthand key entry", function () {
      assertCompile(
        `
let delay = 20
let idle = (options) => 10
idle :delay
`,
        /\s*let delay = 20;\s*let idle = \(options\) => \(?10\)?;?\s*idle\(\{ ?delay(\: delay ?)?\}\);?/,
      );
    });
    it("Function call with shorthand boolean entry", function () {
      assertCompile(
        `
let idle = (options) => 10
idle :force!
`,
        /\s*let idle = \(options\) => \(?10\)?;?\s*idle\(\{ ?force\: true ?\}\);?/,
      );
    });
  });

  describe("Test class", function () {
    it("Class with one method with end", function () {
      assertCompile(
        `
class Person
  def sayHello
    #log("Hello!")
  end
end
`,
        /\s*class Person\s*\{\s+sayHello = \(\) => \{\s*console.log\("Hello!"\);?\s*\};?\s*\}/,
      );
    });
    it("Class with one method with curly braces", function () {
      assertCompile(
        `
class Person {
  def sayHello
    #log("Hello!")
  end
}
`,
        /\s*class Person\s*\{\s+sayHello = \(\) => \{\s*console.log\("Hello!"\);?\s*\};?\s*\}/,
      );
    });
  });

  describe("Colon section begin", function () {
    describe("def", function () {
      it("def inline", function () {
        assertCompile(
          'def sayHello: #log("hello")',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
        );
      });
      it("def inline with parens", function () {
        assertCompile(
          'def sayHello(): #log("hello")',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
        );
      });
      it("def two line", function () {
        assertCompile(
          'def sayHello:\n  #log("hello")',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
        );
      });
      it("def two line with parens", function () {
        assertCompile(
          'def sayHello():\n  #log("hello")',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
        );
      });
      it("def inline stuff after", function () {
        assertCompile(
          'def sayHello: #log("hello"); x = 1',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}\s*x = 1;?/,
        );
      });
      it("def inline stuff with parens after", function () {
        assertCompile(
          'def sayHello(): #log("hello"); x = 1',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}\s*x = 1;?/,
        );
      });
      it("def two line stuff after", function () {
        assertCompile(
          'def sayHello:\n  #log("hello"); x = 1',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}\s*x = 1;?/,
        );
      });
      it("def two line with parens stuff after", function () {
        assertCompile(
          'def sayHello():\n  #log("hello"); x = 1',
          /function sayHello\(\) {\s*console.log\("hello"\);?\s*}\s*x = 1;?/,
        );
      });
    });

    describe("if", function () {
      it("if statement colon", function () {
        assertCompile(
          'if true: #log("hello")',
          /\s*if \(true\) \{\s*console.log\("hello"\);?\s*\}/,
        );
      });
      it("if, elif statement colon", function () {
        assertCompile(
          "if true: x = 10\nelif true: x = 20",
          /\s*if \(true\) \{\s*x = 10;?\s*\} else if \(true\) {\s*x = 20;?\s*}/,
        );
      });
      it("if, else statement colon", function () {
        assertCompile(
          "if true: x = 10\nelse: x = 20",
          /\s*if \(true\) \{\s*x = 10;?\s*\} else {\s*x = 20;?\s*}/,
        );
      });
    });
  });

  describe("Test built-ins", function () {
    it("#keys", testCompile("#keys({})", /Object.keys\(\{\}\)/));
    it("#values", testCompile("#values({})", /Object.values\(\{\}\)/));
    it("#entries", testCompile("#entries({})", /Object.entries\(\{\}\)/));
    it("#argv", testCompile("#argv", /process.argv/));
    it("#PI", testCompile("#PI", /Math.PI/));
    it("#global", testCompile("#global", /globalThis/));
    it("#env", testCompile("#env", /process.env/));
    it("#log", testCompile("#log", /console.log/));

    it("#log hello world", function () {
      assertCompile('#log("Hello world!")', /console.log\("Hello world!"\)/);
    });
    it("#log hello world without parens", function () {
      assertCompile('#log "Hello world!"', /console.log\("Hello world!"\)/);
    });
    it("{x:1}.#log", function () {
      assertCompile("{x:1}.#log", /console.log\(\{ ?x\: ?1 ?\}\);?/);
    });
  });

  describe("Creating functions", function () {
    it("def keyword", function () {
      assertCompile(
        'def sayHello #log("hello") end',
        /function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
      );
    });
    it("def keyword with args", function () {
      assertCompile(
        'def sayHello(name) #log("hello", name) end',
        /function sayHello\(name\) {\s*console.log\("hello", ?name\);?\s*}/,
      );
    });

    it("let keyword with function end", function () {
      assertCompile(
        'let sayHello = function #log("hello") end',
        /let sayHello = function \(\) {\s*console.log\("hello"\);?\s*}/,
      );
    });
    it("let keyword with function end with args", function () {
      assertCompile(
        'let sayHello = function(name) #log("hello", name) end',
        /let sayHello = function \(name\) {\s*console.log\("hello", ?name\);?\s*}/,
      );
    });
    it("let keyword with arrow function", function () {
      assertCompile("let giveMe5 = () => 5", /let giveMe5 = \(\) => \(?5\)?/);
    });
    it("let keyword with arrow function with args", function () {
      assertCompile("let echo = (x) => x", /let echo = \(x\) => \(?x\)?/);
    });

    it("inline with function end", function () {
      assertCompile(
        'let f = function #log("hello") end',
        /let f = function \(\) {\s*console.log\("hello"\);?\s*}/,
      );
    });
    it("inline with function end with args", function () {
      assertCompile(
        'let f = function(x, name) #log("hello", name) end',
        /let f = function \(x,\s*name\) {\s*console.log\("hello", ?name\);?\s*}/,
      );
    });
    it("inline with arrow function", function () {
      assertCompile("() => 5", /\(\) => \(?5\)?/);
    });
    it("inline with arrow function with args no paren", function () {
      assertCompile("x => x", /\(?x\)? => \(?x\)?/);
    });
    it("inline with arrow function with args", function () {
      assertCompile("(x) => x", /\(x\) => \(?x\)?/);
    });

    it("let keyword with do end", function () {
      assertCompile(
        'let sayHello = do #log("hello") end',
        /let sayHello = function \(\) {\s*console.log\("hello"\);?\s*}/,
      );
    });
    it("let keyword with do end with args", function () {
      assertCompile(
        'let sayHello = do |name| #log("hello", name) end',
        /let sayHello = function \(name\) {\s*console.log\("hello", ?name\);?\s*}/,
      );
    });

    describe("With curly braces", function () {
      it("let keyword with fn", function () {
        assertCompile(
          "let functionNoArgs_7 = fn () {return null}",
          /let functionNoArgs_7 = function \(\) {\s*return null;?\s*};?/,
        );
      });
      it("fn keyword", function () {
        assertCompile(
          "fn functionNoArgs_8() {return null}",
          /function functionNoArgs_8\(\) {\s*return null;?\s*};?/,
        );
      });
      it("function keyword", function () {
        assertCompile(
          "function functionNoArgs_9() {return null}",
          /function functionNoArgs_9\(\) {\s*return null;?\s*};?/,
        );
      });

      it("inline with arrow function with args", function () {
        assertCompile("(x) => x", /\(x\) => \(?x\)?/);
      });
    });
  });

  describe("Test if statements", function () {
    it("if statements blocks", function () {
      assertCompile(
        'if true #log("hello") end',
        /\s*if \(true\) \{\s*console.log\("hello"\);?\s*\}/,
      );
    });
    it("if statements blocks, operation condition", function () {
      assertCompile(
        `
      if x === 1
        #log("hello")
      end
    `,
        /\s*if \(x === 1\) \{\s*console.log\("hello"\);?\s*\}/,
      );
    });

    it("if modifier", function () {
      assertCompile(
        'let x; x = "10" if true',
        /let x;\s*if \(?true\)? \{\s*x = "10";?\s*\}/,
      );
    });
    it("if statements blocks with elsif and else", function () {
      assertCompile(
        `if true
  x = 1
elsif false
  x = 2
else
  x = 3
end
`,
        /\s*if \(true\) \{\s*x = 1;\s*\} else if \(false\) \{\s*x = 2;\s*\} else \{\s*x = 3;\s*\}/,
      );
    });
  });

  describe("Test attribute accessor", function () {
    it("({x:5}).x", function () {
      assertCompile("({x:5}).x", /\(\{ ?x\: ?5 ?\}\)\.x/);
    });
    it("let o; o.x", function () {
      assertCompile("let o; o.x", /let o;\s*?o\.x;?/);
    });

    describe("Optional attribute accessor", function () {
      it("let o; o?.x", function () {
        assertCompile("let o; o?.x", /let o;\s*?o\?\.x;?/);
      });
      it("let o; o?.x?.y", function () {
        assertCompile("let o; o?.x?.y", /let o;\s*?o\?\.x\?\.y;?/);
      });
    });
  });

  describe("Test attribute setter", function () {
    it("let o; o.x = 10", function () {
      assertCompile("let o; o.x = 10", /let o;\s*?o\.x ?= ?10;?/);
    });
  });

  describe("Values", function () {
    it("integer", function () {
      assertCompile("10", /10/);
      assertCompile("1234", /1234/);
    });
    it("float", function () {
      assertCompile("1.0", /1.0/);
      assertCompile("12.34", /12.34/);
    });

    describe("Language constant values", function () {
      it("true", testCompile("true", /true/));
      it("false", testCompile("false", /false/));
      it("null", testCompile("null", /null/));
      it("undefined", testCompile("undefined", /undefined/));
    });

    describe("Arrays", function () {
      it("[]", testCompile("[]", /\[\]/));
      it("[1,2,3]", testCompile("[1,2,3]", /\[1, ?2, ?3\]/));
      it("[,,]", testCompile("[,,]", /\[, ?, ?\]/));
      it("[,\n\n,]", testCompile("[,\n\n,]", /\[, ?, ?\]/));
      it("[\n\n]", testCompile("[\n\n]", /\[\]/));
      it(
        "Newlines can be used instead of commas",
        testCompile("[1\n2\n3]", /\[1, ?2, ?3\]/),
      );
    });
  });

  describe("Types", function () {
    describe("Variable declaration", function () {
      describe("Default types with type before", function () {
        it("int", testCompile("int x", /let x/));
        it("int assignment", testCompile("int x = 0", /let x = 0/));
        it("float", testCompile("float x", /let x/));
        it("float assignment", testCompile("float x = 1.0", /let x = 1\.0/));
        it("string", testCompile("string x", /let x/));
        it(
          "string assignment",
          testCompile('string x = "hello"', /let x = "hello"/),
        );
        it("bool", testCompile("bool x", /let x/));
        it("bool assignment", testCompile("bool x = true", /let x = true/));
        it("int[]", testCompile("int[] x", /let x/));
        it(
          "int[] assignment",
          testCompile("int[] x = [1,2,3]", /let x = \[1, ?2, ?3\]/),
        );
      });
      describe("Default types with type after", function () {
        it("int", testCompile("let x : int", /let x/));
        it("int assignment", testCompile("let x : int = 0", /let x = 0/));
        it("float", testCompile("let x : float", /let x/));
        it(
          "float assignment",
          testCompile("let x : float = 1.0", /let x = 1\.0/),
        );
        it("string", testCompile("let x : string", /let x/));
        it(
          "string assignment",
          testCompile('let x : string = "hello"', /let x = "hello"/),
        );
        it("bool", testCompile("let x : bool", /let x/));
        it(
          "bool assignment",
          testCompile("let x : bool = true", /let x = true/),
        );
        it("int[]", testCompile("let x : int[]", /let x/));
        it(
          "int[] assignment",
          testCompile("let x : int[] = [1,2,3]", /let x = \[1, ?2, ?3\]/),
        );
      });
    });
  });

  describe("Test objects", function () {
    it("({})", testCompile("({})", /\(\{\}\)/));
    it("{x: 1}", testCompile("{x: 1}", /\{\s*x\: ?1;?\s*\}/));
    it("{x: 1, y: 2}", testCompile("{x: 1, y: 2}", /\{\s*x\: ?1, y: 2\s*\}/));
    it(
      "Newlines can be used instead of commas",
      testCompile("{x: 1\ny: 2}", /\{\s*x\: ?1, y: 2\s*\}/),
    );
    it("key is quoted string", testCompile('{"x": 1}', /\{\s*x\: ?1;?\s*\}/));
  });

  describe("No group", function () {
    it("Test each do end", function () {
      assertCompile(
        `
  [1,2,3,4,5].each do |i|
    console.log i
  end
  `,
        /\s*\[1, 2, 3, 4, 5\]\.each\(function \(i\) \{\s*console\.log\(i\);?\s*\}\)\s*/,
      );
    });
    it("Pass named parameters to functions", function () {
      assertCompile("add x: 1, y: 2", /add\(\{ x: 1, y: 2 \}\)/);
    });

    it("let shouldAddSemiToDec = 1", function () {
      assert.match(
        compile("let shouldAddSemiToDec = foo()[0]", { prettier: false }),
        /;\s*$/,
      );
    });
  });

  describe("Assignment", function () {
    it("let x = 1", testCompile("let x = 1", /(var|let)\s+x\s*=\s*1/));
    it("var x = 1", testCompile("var x = 1", /var\s+x\s*=\s*1/));
    it("const x = 1", testCompile("const x = 1", /const\s+x\s*=\s*1/));
  });

  describe("Operations", function () {
    describe("Inversion (! operator)", function () {
      it("!true", testCompile("!true", /!true/));
      it("!true === false", testCompile("!true === false", /!true === false/));
      it(
        "!true === !false",
        testCompile("!true === !false", /!true === !false/),
      );
      it(
        "!true === !!false",
        testCompile("!true === !!false", /!true === !!false/),
      );
    });
    describe("Mathematic operations", function () {
      it("addition", function () {
        assertCompile("1 + 2", /1 \+ 2/);
        assertCompile("1 + 2 + 3", /1 \+ 2 \+ 3/);
      });
      it("multiplication", function () {
        assertCompile("1 * 2", /1 \* 2/);
        assertCompile("1 * 2 * 3", /1 \* 2 \* 3/);
      });
      it("division", function () {
        assertCompile("8 / 2", /8 \/ 2/);
        assertCompile("8 / 4 / 2", /8 \/ 4 \/ 2/);
      });
      it("substraction", function () {
        assertCompile("8 - 2", /8 \- 2/);
        assertCompile("8 - 2 - 3", /8 \- 2 \- 3/);
      });
    });
    describe("Priority of operations", function () {});
  });

  describe('Test "ternary"', function () {
    it("true ? 1", testCompile("true ? 1", /true \? 1 : null/));

    it("false ? 1 : 0", testCompile("false ? 1 : 0", /false \? 1 : 0/));
  });

  describe("Error handling", function () {
    it("throw string", function () {
      assertCompile('throw "error"', /throw "error"/);
    });
    it("throw new error", function () {
      assertCompile('throw new Error("error")', /throw new Error\("error"\)/);
    });
    it("try catch end", function () {
      assertCompile(
        `
      try
        throw new Error("Some error")
      catch (e)
      end
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*catch\s*\(e\)\s*{\s*}\s*/,
      );
    });
    it("try finally end", function () {
      assertCompile(
        `
      try
        throw new Error("Some error")
      finally
        done = true
      end
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*finally\s*{\s*done = true;?\s*}\s*/,
      );
    });
    it("try catch finally end", function () {
      assertCompile(
        `
      try
        throw new Error("Some error")
      catch (e)
      finally
        done = true
      end
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*catch\s*\(e\)\s*{\s*}\s*finally\s*{\s*done = true;?\s*}\s*/,
      );
    });
    it("try catch curly braces", function () {
      assertCompile(
        `
      try {
        throw new Error("Some error")
      } catch (e) {
      }
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*catch\s*\(e\)\s*{\s*}\s*/,
      );
    });
    it("try finally curly braces", function () {
      assertCompile(
        `
      try {
        throw new Error("Some error")
      } finally {
        done = true
      }
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*finally\s*{\s*done = true;?\s*}\s*/,
      );
    });
    it("try catch finally curly braces", function () {
      assertCompile(
        `
      try {
        throw new Error("Some error")
      } catch (e) {
      } finally {
        done = true
      }
    `,
        /\s*try\s*\{\s*throw new Error\("Some error"\);?\s*\}\s*catch\s*\(e\)\s*{\s*}\s*finally\s*{\s*done = true;?\s*}\s*/,
      );
    });
  });

  describe("Parallelization", function () {
    it("async", function () {
      assertCompile(
        'async def sayHello: #log("hello")',
        /async function sayHello\(\) {\s*console.log\("hello"\);?\s*}/,
      );
    });
    it("await", function () {
      assertCompile("await foo()", /await foo\(\)/);
    });
  });

  describe("chain", function () {
    it("chain function", function () {
      assertCompile(
        "obj chain\n  method1 1\n  method2 2\nend",
        /\(\(\) => {\s*let __chain = obj;\s*__chain.method1\(1\);\s*return __chain.method2\(2\);\s*}\)\(\);/,
      );
    });

    it("chain assignment", function () {
      assertCompile(
        "obj chain\n  prop1 = 1\n  prop2 = 2\nend",
        /\(\(\) => {\s*let __chain = obj;\s*__chain.prop1 = 1;\s*__chain.prop2 = 2;\s*}\)\(\);/,
      );
    });
  });

  describe("Require file handlers", function () {
    it("js file", function () {
      assertCompile("#('./file.js')", /^require\(".\/file.js"\);?\s*$/);
    });
    it("js file with arg", function () {
      assertCompile(
        "#('./file.js', 10)",
        /^require\(".\/file.js"\)\(10\);?\s*$/,
      );
    });
    it("jome file", function () {
      assertCompile("#('./file.jome')", /^require\(".\/file.js"\)\(\);?\s*$/);
    });
    it("jome file with arg", function () {
      assertCompile(
        "#('./file.jome', 20)",
        /^require\(".\/file.js"\)\(20\);?\s*$/,
      );
    });
  });

  describe("Include file handlers", function () {
    it.skip("include txt file", function () {
      assertCompile("#...('./data/test.txt')", /`forRealTest`/);
    });
  });

  describe("General bugs", function () {
    it("let port = options.port || 3000", function () {
      assertCompile(
        "let port = options.port || 3000",
        /let port = options.port \|\| 3000/,
      );
    });
    it("with options = {} end", function () {
      assertCompile("with options = {} end", /\s*/);
    });
  });
};
