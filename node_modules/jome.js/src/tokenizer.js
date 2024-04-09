// import FirstMate from 'first-mate'
const FirstMate = require('first-mate')
const path = require('path')

const registry = new FirstMate.GrammarRegistry()
//registry.loadGrammarSync('./grammar/syntaxes/JavaScript.tmLanguage.json')
let grammarFilePath = path.join(__dirname, '../data/jome.tmLanguage.json')
const grammar = registry.loadGrammarSync(grammarFilePath)

const POST_PROCESSES = new Set([
  "keyword.control.inline-conditional.jome",
  "meta.obj-block.jome",
  "meta.getter.jome",
  "entity.name.function.utility-inline.jome"
])

function _ignoreNode(node) {
  return typeof node === 'string' || node.type === 'newline' || node.type.startsWith('comment')
}

class ScopeNode {
  constructor(type, lineNb, chStartIdx) {
    this.type = type
    this.children = []
    this.parent = null
    this.lineNb = lineNb
    this.index = 0 // index of parent's children
    this.chStartIdx = chStartIdx // The start index of the character in the document
  }
  addChild(child) {
    if (typeof child !== 'string') {
      child.parent = this // If it is a ScopeNode
      child.index = this.children.length
    }
    this.children.push(child)
  }
  toArrayStruct() {
    return [this.type, ...this.children.map(c => (typeof c === 'string' ? c : c.toArrayStruct()))]
  }
  print() {
    return JSON.stringify(this.toArrayStruct())
  }
  text() {
    if (this.children.length !== 1 || (typeof this.children[0] !== 'string')) {
      return ''
      // console.error('Error reading node text() expected a simple string token but got', this)
    }
    return this.children[0]
  }
  captureNext() {
    let next = this.next()
    next.captured = true
    return next
  }
  next() {
    let siblings = this.parent.children
    let prev = null
    for (let i = this.index+1; i < siblings.length; i++) {
      let s = siblings[i]
      if (!_ignoreNode(s)) {
        if (prev && s.type && !POST_PROCESSES.has(s.type)) {
          return prev
        }
        prev = s
      }
    }
    return prev
  }
  prev() {
    let siblings = this.parent.children
    for (let i = this.index-1; i >= 0; i--) {
      let s = siblings[i]
      if (!_ignoreNode(s)) { return s }
    }
    return null
  }
}

// Return a ScopeNode
function decodeTokensAsTree(lines) {
  let scopes = []
  let root = new ScopeNode("ROOT");
  let currentNode = root;
  let chStartIdx = 0
  lines.forEach((lineTags, lineNbIdx) => {
    let {line, tags} = lineTags
    let offset = 0;
    for (let i = 0; i < tags.length; i++) {
      let tag = tags[i];
      if (tag >= 0) {
        let str = line.substring(offset, offset + tag)
        chStartIdx += str.length
        if (!str.length || scopes[scopes.length-1] === 'ignore' || str === '\r') {
          // Ignore whitespaces (except indent)
        } else {
          currentNode.addChild(str)
        }
        offset += tag;
      } else if ((tag % 2) === -1) {
        let scope = registry.scopeForId(tag)
        scopes.push(scope);
        if (scope !== "ignore") {
          let node = new ScopeNode(scope, lineNbIdx+1, chStartIdx)
          currentNode.addChild(node)
          currentNode = node
        }
      } else {
        let expectedScopeName = registry.scopeForId(tag + 1);
        let poppedScopeName = scopes.pop();
          if (poppedScopeName !== expectedScopeName) {
            throw new Error("Expected popped scope to be " + expectedScopeName + ", but it was " + poppedScopeName);
          }
        if (expectedScopeName !== "ignore") {
          currentNode = currentNode.parent
        }
      }
    }
    if (lineNbIdx+1 !== lines.length) {
      currentNode.addChild(new ScopeNode("newline", lineNbIdx+1, chStartIdx))
    }
    chStartIdx += 1
  });
  return root.children[0]
}

class LineTags {
  constructor(line, tags) {
    this.line = line
    this.tags = tags
  }
}

// The tags returned work as follows:
// An odd negative number is the beginning of a scope
// An even negative number is the end of a scope
// A positive number is the number of characters used
// Returns an array of LineTags.
function tokenizeLines(text) {
  let ref;
  let compatibilityMode = true; // FIXME: I don't know what this does
  let lines = text.split('\n');
  let lastLine = lines.length - 1;
  let results = [];
  for (let i = 0, _len = lines.length; i < _len; i++) {
    ref = grammar.tokenizeLine(lines[i], ref?.ruleStack, i === 0, compatibilityMode, i !== lastLine)
    // OPTIMIZE: I should probably keep the line number here somehow for debugging purpose
    results.push(new LineTags(lines[i], [...ref.tags]))
  } 
  return results;
}

function tokenize(text) {
  let lines = tokenizeLines(text)
  return decodeTokensAsTree(lines)
}

module.exports = {
  POST_PROCESSES,
  tokenize,
}