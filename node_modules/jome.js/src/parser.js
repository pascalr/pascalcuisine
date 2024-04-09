/*
The function responsible for constructing the AST is commonly known as the "parser." The parser takes
a sequence of tokens as input and builds a tree structure based on the grammar rules of the programming language.

The name of the function can vary, but it is often named something like parse or buildAST. For example:

You may also want to consider incorporating error handling in your parser to report syntax errors or other
issues found during the parsing process.

Overall, breaking down the compilation process into distinct phases, such as lexical analysis (tokenization)
and syntax analysis (parsing), helps in creating a modular and maintainable compiler design.
*/

const OPERAND_TYPES = [
  "keyword.operator.jome",
  "keyword.operator.logical.unary.jome",
  "keyword.operator.existential.jome",
  "keyword.operator.comparison.jome",
  "constant.numeric.integer.jome",
  "constant.numeric.float.jome",
  "string.quoted.single.jome",
  "string.quoted.double.jome",
  "string.quoted.backtick.jome",
  "string.quoted.double.verbatim.jome",
  "string.quoted.backtick.verbatim.jome",
  "meta.group.jome",
  "INLINE_FUNCTION_CALL",
  "meta.square-bracket.jome",
  "meta.block.jome",
  "VARIABLE",
  "variable.other.constant.utility.jome",
  "constant.language.jome",
  "support.variable.jome",
  "FUNCTION_CALL",
  // FIXME: These should be renamed, they should end with .jome ... meta.embedded.js.jome, meta.embedded.md.jome, etc
  "meta.embedded.block.javascript",
  "meta.embedded.block.shell",
  "meta.embedded.block.markdown",
  "meta.embedded.block.css",
  "meta.embedded.block.html",
  "keyword.other.string-format.jome",
  "entity.name.function.utility-inline.jome",
  "meta.getter.jome",
  "meta.getter.bracket.optional.jome",
  "constant.language.boolean.jome"
]

function compileTokenRaw(token) {
  if (Array.isArray(token)) {
    return token.map(n => compileTokenRaw(n)).join('')
  } else if (token.type === 'newline') {
    return '\n'
  } else if (typeof token === 'string') {
    return token
  } else if (token.type === "raw") {
    return token.raw
  } else if (!token.children) {
    throw new Error('sf780h9273ghf74923h34')
  } else {
    return token.children.map(n => compileTokenRaw(n)).join('')
  }
}

// An abstract syntax tree (AST) node
class ASTNode {
  constructor(token, parent, lexEnv) {
    if (typeof token === 'string') {
      this.type = 'raw'
      this.raw = token
    } else {
      this.type = token.type
      this.raw = compileTokenRaw(token.children)
    }
    this.token = token
    this.parent = parent
    let prec = PRECEDENCES[this.type]
    this.precedence = (typeof prec === 'function') ? prec(token) : (prec || 0)
    // FIXME: Depending on the type of the node, create a nested lexical environment (for functions, if blocks, ...)
    this.lexEnv = lexEnv // Keep a reference to the lexical environment
    this.operands = [] // Operands is used for AST nodes by handling captures and precedence
    if (token.children && !(token.children.length === 1 && typeof token.children[0] === "string")) {
      // Parts represent the inner components of the node
      this.parts = parse(token.children, this, lexEnv)
    }
    this.errors = []
    let data = TOKENS[this.type]
    if (data) {
      this.captureLeft = data.captureLeft
      this.captureRight = data.captureRight
      this.captureSection = data.captureSection
    }
    // this.block = null // Code block
  }

  get ctxFile() {
    return this.lexEnv.ctxFile
  }
  get compilerOptions() {
    return this.lexEnv.ctxFile.compilerOptions
  }
}

// function defaultStringTokens(array) {
//   return array.map(e => typeof e === 'string' ? {type: 'string', children: [e]} : e)
// }
function filterSpaces(array) {
  return array.filter(e => !/^\s*$/.test(e)).filter(e => !e.type?.startsWith('punctuation.whitespace'))
}
function filterStrings(array) {
  return array.filter(e => typeof e !== 'string')
}
function filterNodes(node, array) {
  if (node && node.type.startsWith("string")) { // don't filter strings of strings
    return array
  }
  return array.filter(e => typeof e !== 'string' && e.type !== 'comment.block.jome' && e.type !== 'comment.line.double-slash.jome')
}

// someFunc(someVal)[someIndex].someProp.#someFunc // These should all be merged into a single node
function mergeChainables(nodes) {
  let merged = []
  let current = nodes[0]
  for (let i = 0; i < nodes.length; i++) {
    let lookahead = nodes[i+1]
    if (lookahead && CHAINABLE_TYPES.includes(lookahead.type) && OPERAND_TYPES.includes(current.type)) {
      lookahead.operands.push(current)
    } else {
      merged.push(current)
    }
    current = lookahead
  }
  return merged
}

// merge those that are capture right only, not operators that capture left and right
// only capture those that have the highest precedence (like !)
function mergeCaptureRightHighPrecedence(nodes) {
  let merged = []
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i]
    if (n.captureRight && !n.captureLeft && nodes[i+1] && (n.precedence > nodes[i+1].precedence && (!nodes[i+2]?.captureLeft || n.precedence > nodes[i+2].precedence))) {
      n.operands.push(nodes[i+1])
      i += 1
    }
    merged.push(n)
  }
  return merged
}

// merge those that are capture right only, not operators that capture left and right
// only capture those that have the highest precedence (like !)
function mergeCodeBlocks(nodes) { // TODO: Sections here too?
  if (!nodes.length) {return []}
  let merged = [nodes[0]]
  for (let i = 1; i < nodes.length; i++) {
    let n = nodes[i]
    if (n.type === "CODE_BLOCK") {
      merged[merged.length-1].block = n
    } else {
      merged.push(n)
    }
  }
  return merged
}

// Create an abstract syntax tree (AST) from tokens. Returns a list of ASTNode.
function parse(tokens, parent, lexEnv) {

  // All the tokens converted to nodes
  let allNodes = filterNodes(parent, tokens).map(tok => new ASTNode(tok, parent, lexEnv))
  // Only the top nodes
  let topNodes = []

  // Doing passes like that feels inefficient, but it's simple and works. Good enough for now.

  // As a first pass, merge all the chainable nodes together. They have highest precedence.
  let firstPass = mergeChainables(allNodes)
  let secondPass = mergeCodeBlocks(firstPass)
  let nodes = mergeCaptureRightHighPrecedence(secondPass)

  // lhs === left hand side
  // rhs === right hand side
  const parseSingleExpression = (lhs, minPrecedence) => {
    if (lhs.captureRight && lhs.operands.length <= 0) {
      // if (lhs.precedence > nodes[0].precedence && (!nodes[1]?.captureLeft || lhs.precedence > nodes[1].precedence)) {
      //   lhs.operands.push(nodes.shift())
      // } else {
        lhs.operands.push(parseSingleExpression(nodes.shift(), lhs.precedence)) // FIXME: No idea if lhs.precedence is correct, pure guess
      // }
    } else if (lhs.captureSection) {
      let t = lhs.parts[lhs.parts.length-1].type
      if (t === "punctuation.section.function.begin.jome" || t === "BEGIN_SECTION" || (nodes[0]?.type === "CODE_BLOCK")) {
        let next = nodes.shift()
        while (next && next.type === 'newline') {
          next = nodes.shift()
        }
        lhs.operands.push(parseSingleExpression(next, lhs.precedence)) // FIXME: No idea if lhs.precedence is correct, pure guess
      }
    }
    let lookahead = nodes[0]
    while (
      lookahead &&
      lookahead.precedence >= minPrecedence &&
      lookahead.captureLeft
    ) {
      const op = lookahead;
      // TODO: Check if capture right
      nodes.shift()
      let rhs = nodes[0]
      nodes.shift();
      lookahead = nodes[0]
      while (
        lookahead &&
        ((lookahead.precedence > op.precedence) ||
          (lookahead.precedence === op.precedence &&
            lookahead.rightAssociative)) // right associative is not used yet
      ) {
        rhs = parseSingleExpression(rhs, op.precedence + (lookahead.precedence > op.precedence ? 1 : 0));
        lookahead = nodes[0];
      }
      op.operands = [lhs, rhs];
      lhs = op;
    }
    return lhs;
  };

  while (nodes.length) {
    topNodes.push(parseSingleExpression(nodes.shift(), 0))
  }

  topNodes.forEach((n,i) => {n.siblingIdx = i})

  return topNodes
}

// Chainable types have the highest precedence and are all equal
const CHAINABLE_TYPES = [
  "meta.group.jome",
  "meta.square-bracket.jome",
  "entity.name.function.utility-inline.jome",
  "meta.getter.jome",
  "meta.caller.jome",
  "meta.chain.jome",
  "INLINE_FUNCTION_CALL",
  "meta.function-call.WIP.jome",
  "keyword.other.string-format.jome",
  "meta.getter.bracket.optional.jome",
]

const PRECEDENCES = {
  'keyword.operator.logical.unary.jome': 2000,
  // not operators are higher than arithmetic operators: !0 + !1
  'keyword.operator.jome': (token => {
    let op = token.text()
    if (op === '+' || op === '-') {
      return 1000
    } else if (op === '*' || op === '/') {
      return 1100
    } else if (op === '^') {
      return 1200
    }
  }),
  "OP_AND": 800,
  "OP_OR": 700,
  // arithmetic operators are higher than comparison: x + 10 < y - 20
  'keyword.operator.comparison.jome': 500,
  // Comparison is higher than nullish coalescing: x ?? y > z
  'keyword.operator.nullish-coalescing.jome': 450,
  // In javascript, nullish coalescing has higher precedence than ternary.
  'keyword.operator.existential.jome': 400,
  'keyword.operator.colon.jome': 399,
  // Ternary is higher than arrow function: inspectTruthness = |x| => x ? 'truthy' : 'falsy'
  'keyword.arrow.jome': 300,
  // Arrow function is higher than assignment: add5 = |x| => x + 5
  'ASSIGN': 250,
  // Assigment and dictionary key have the same precedence. (They should never be used together)
  'meta.dictionary-key.jome': 250,
  // Assignment is higher than new: x = new Foo()
  'keyword.operator.new.jome': 235,
  // New is higher than return: return new Foo()
  'keyword.control.return.jome': 225,
  // Throw is the same as return
  'keyword.control.throw.jome': 225,
  // Throw is higher than inline conditional: throw 'error' if true
  'keyword.control.inline-conditional.jome': 200,
}

const TOKENS = {
  // foo:
  "meta.dictionary-key.jome": {
    captureRight: true,
  },
  // js uses more specifically:
  // keyword.operator.arithmetic.jome
  // keyword.operator.logical.jome
  // + - * / ^
  'keyword.operator.jome': {
    captureLeft: true,
    captureRight: true,
  },
  'keyword.operator.existential.jome': {
    captureLeft: true,
    captureRight: true,
  },
  //'keyword.operator.nullish-coalescing.jome'
  'keyword.operator.colon.jome': {
    captureLeft: true,
    captureRight: true,
  },
  // =>
  'keyword.arrow.jome': {
    captureLeft: true, // TODO: Allow to optionnally capture left, so allow no arguments
    captureRight: true,
  },
  // !
  "keyword.operator.logical.unary.jome": {
    captureRight: true,
  },
  "OP_OR": { captureLeft: true, captureRight: true },
  "OP_AND": { captureLeft: true, captureRight: true },
  // ==, !=, ===, !===
  'keyword.operator.comparison.jome': {
    captureLeft: true,
    captureRight: true,
  },
  // statement if cond
  'keyword.control.inline-conditional.jome': {
    captureLeft: true,
    captureRight: true,
  },
  // elif, elsif, else if
  'keyword.control.conditional.jome': {
    captureRight: true,
  },
  // =
  'ASSIGN': {
    captureLeft: true,
    captureRight: true,
  },
  // return
  "keyword.control.return.jome": {
    captureRight: true
  },
  // throw
  "keyword.control.throw.jome": {
    captureRight: true
  },
  // new
  "keyword.operator.new.jome": {
    captureRight: true
  },
  // main
  "keyword.control.main.jome": {
    captureRight: true
  },
  // def
  "meta.def.jome": {
    captureSection: true
  },
  "FUNCTION": {
    captureSection: true
  },
  "IF_BLOCK": {
    captureSection: true
  },
  "ELSIF_BLOCK": {
    captureSection: true
  },
  "ELSE_BLOCK": {
    captureSection: true
  },
  // async
  "storage.modifier.async.jome": {
    captureRight: true
  },
  // await
  "keyword.control.flow.jome": {
    captureRight: true
  },
}

module.exports = {
  parse,
  compileTokenRaw,
  filterSpaces,
  filterStrings,
  OPERAND_TYPES
}
