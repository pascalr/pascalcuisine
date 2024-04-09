const {OPERAND_TYPES, filterSpaces, filterStrings, compileTokenRaw} = require("./parser.js")

const {FileImports, BindingKind} = require("./context.js")

const fs = require("fs")
const path = require("path")

class SyntaxError extends Error {
  constructor(node, message) {
    super(message);
    this.node = node
  }
}
// try {
//   analyzer(node)
// } catch (error) {
//   if (error instanceof SyntaxError) {
//     pushError(error.node, error.message)
//   } else {
//     throw error;
//   }
// }

// Extract expressions from curly braces, a colon or end keyword.
function extractExpressionsFUNCTION(node, partsFilterList=[]) {
  if (node.block) {
    return node.block.parts
  } else if (node.operands.length) {
    // When the function uses the colon style, the expressions will be the operands
    return node.operands
  } else {
    return filterCommas(filterSpaces(node.parts.filter(p => !partsFilterList.includes(p.type))))
  }
}

// Extract expressions from curly braces, a colon or end keyword.
function extractExpressionsIF_BLOCK(node, parts) {
  if (node.block) {
    return node.block.parts
  } else if (node.operands.length) {
    // When the function uses the colon style, the expressions will be the operands
    return node.operands
  } else {
    return parts
  }
}

function groupManyByType(arr) {
  return (arr||[]).reduce((grouped, item) => {
    if (!grouped[item.type]) {
      grouped[item.type] = [];
    }
    grouped[item.type].push(item);
    return grouped;
  }, {});
}

function groupByType(arr) {
  return (arr||[]).reduce((grouped, item) => {
    if (grouped[item.type]) {
      // throw new SyntaxError()
      throw new Error("groupByType expects a single element of each type only. Use groupManyByType to have many")
    }
    grouped[item.type] = item;
    return grouped;
  }, {});
}

function nodePositionData(node) {
  return {
    lineNb: node.token.lineNb,
    startIndex: node.token.chStartIdx,
    endIndex: node.token.chStartIdx + node.raw.length,
  }
}

function analyzeFUNCTION(node, nameNode, argsNodes, expressions) {

  if (nameNode) {
    pushBinding(nameNode, nameNode.raw, {type: 'def', kind: BindingKind.Function})
  }

  ;(argsNodes||[]).forEach(part => {
    if (part.type === 'ARGUMENT') {
      pushBinding(part, part.raw, {type: 'argument', kind: BindingKind.Variable})
    // } else if (part.type === 'TODO assignement') {
    }
  })
  // argsNodes.analyzed = true
}

function pushError(node, message) {
  // this.suggestions = []
  // this.uid = null // A four or five digits number? See Language Server Diagnostic source
  let error = {
    ...nodePositionData(node),
    message
  }
  //pushError(node, message)
  node.ctxFile.errors.push(error)
  return error
}

function pushBinding(node, bindingName, data) {
  node.lexEnv.addBinding(bindingName, {
    ...nodePositionData(node),
    ...data
  })
  if (data.kind) {
    let t = data.type
    if (t === 'declaration' || t === 'def' || t === 'class') {
      pushSymbol(node, {name: bindingName, ...data})
    }
    pushOccurence(node, {name: bindingName})
  }
}

// A symbol is something concrete. It will show up in the outline. Ex: function, class, ...
function pushSymbol(node, data) {
  node.ctxFile.symbols.push({...nodePositionData(node), ...data})
}

// An occurence is a usage of a symbol. For exemple, every time a variable is used, it creates an occurence. The declaration creates an occurence too.
function pushOccurence(node, data) {
  node.ctxFile.occurences.push({...nodePositionData(node), ...data, lexEnv: node.lexEnv})
}

function pushFileLink(node, file, data={}) {
  node.ctxFile.filesLinks.push({file, ...nodePositionData(node), ...data})
}

// TODO: Make sure no infinite loop
function _analyzeNodes(nodes) {
  nodes.forEach(node => {
    if(node.analyzed) {return;} // Skip already analyzed
    // Analyze the operands first
    if (node.operands?.length) {
      analyzeNodes(node.operands)
    }
    let analyzer = ANALYZERS[node.type]
    if (analyzer) {
      analyzer(node)
    }
    if (node.parts?.length) {
      analyzeNodes(node.parts)
    }
  });
  return nodes[0]?.ctxFile.errors
}

// TODO: Make sure no infinite loop
function analyzeNodes(nodes) {
  if (!nodes || !nodes.length) {return;}
  let errors = _analyzeNodes(nodes)
  let ctxFile = nodes[0].ctxFile
  let lexEnv = ctxFile.lexEnv
  // TODO: Make sure that the occurence is declared before being used for variables and classes.
  ctxFile.occurences.forEach(occurence => {
    let binding = lexEnv.getBinding(occurence.name)
    if (binding) {
      occurence.kind = binding.kind
      ctxFile.validOccurences.push(occurence)
    } else {
      ctxFile.undeclaredOccurences.push(occurence)
    }
    // TODO: Check if the occurence was declared in the lex env
  })
  return errors
}

function ensureLhsOperand(node) {
  // return validateoperands(2, OPERAND_TYPES)(node)
  if (node.operands.length !== 1) {
    pushError(node, `Missing left hand side operand for token ${node.type}`)
  }
  if (node.operands.length && !OPERAND_TYPES.includes(node.operands[0].type)) {
    pushError(node, `Invalid operand type for operator ${node.type}. Was: ${node.operands[0].type}`)
  }
}
function ensureStartRaw(node, str) {
  if (node.parts[0]?.raw !== str) {
    pushError(node, `Internal error. ${node.type} should always start with token ${str}. Was ${node.parts[0]?.raw}`)
  }
}
function ensureStartType(node, str) {
  if (node.parts[0]?.type !== str) {
    pushError(node, `Internal error. ${node.type} should always start with token of type ${str}. Was ${node.parts[0]?.type}`)
  }
}
function ensureEndRaw(node, str) {
  let s = node.parts[node.parts.length-1]?.raw
  if (s !== str) {
    pushError(node, `Internal error. ${node.type} should always end with token ${str}. Was ${s}`)
  }
}
function ensureEndType(node, str) {
  let s = node.parts[node.parts.length-1]?.type
  if (s !== str) {
    pushError(node, `Internal error. ${node.type} should always end with token of type ${str}. Was ${s}`)
  }
}
function ensureAllTypeIn(node, list, arr) {
  list.forEach(el => {
    if (!arr.includes(el.type)) {
      pushError(node, `Error. ${node.type} malformed expression. Unexpected children token type ${el.type}`)
    }
  })
}

function ensureListSeparatedByCommas(node, items) {
  // All the even index operands should be punctuation.separator.delimiter.jome
  if (items.some((c,i) => (i % 2 === 1) && (c.type !== 'punctuation.separator.delimiter.jome'))) {
    pushError(node, "Syntax error. Expecting commas between every element inside a list")
  }
}

// Allow commas or newlines as separator
function parseList(items) {
  let modified = []
  let itemBefore = false
  items.forEach(item => {
    if (item.type === 'punctuation.separator.delimiter.jome') {
      modified.push(item)
      itemBefore = false
    } else if (item.type === 'newline') {
      if (itemBefore) {
        // Insert a comma
        modified.push({...item, type: 'punctuation.separator.delimiter.jome', raw: ','})
        itemBefore = false
      }
    } else if (itemBefore) {
      pushError(node, "Syntax error. Expecting commas or newlines between every element inside a list")
    } else {
      modified.push(item)
      itemBefore = true
    }
  })
  return modified
}

function filterNewlines(list) {
  return list.filter(el => el.type !== 'newline')
}

function filterCommas(list) { // 'commas'?
  return list.filter(el => el.type !== 'commas' && el.type !== 'punctuation.separator.delimiter.jome')
}

// const validateoperands = (nb, types) => (node) => {
//   if (node.operands.length !== nb) {
//     return "Invalid number of operands for node."
//   } else if (!node.operands.every(child => types.includes(child.type))) {
//     return `Invalid operands type for node ${node.type}. Was: ${node.type}`
//   }
// }

// Depreacted: Use ensureLhsOperand instead.
function validateOperatorUnary(node) {
  // return validateoperands(2, OPERAND_TYPES)(node)
  if (node.operands.length !== 1) {
    return pushError(node, "A unary operator must have a single operand")
  }
  if (!OPERAND_TYPES.includes(node.operands[0].type)) {
    return pushError(node, `Invalid operand type for operator ${node.type}. Was: ${node.operands[0].type}`)
  }
}

function validateOperator(node) {
  let op = node.raw
  // return validateoperands(2, OPERAND_TYPES)(node)
  if (node.operands.length !== 2) {
    return pushError(node, `Binary operator ${op} must have two operands`)
  }

  for (let i = 0; i < node.operands.length; i++) {
    let child = node.operands[i]
    if (!OPERAND_TYPES.includes(child.type)) {
      return pushError(node, `Invalid operand type for operator ${op}. Was: ${child.type}`)
    }
  }
}

function validateString(node, char) {
  ensureStartRaw(node, char)
  ensureStartType(node, 'punctuation.definition.string.begin.jome')
  ensureEndRaw(node, char)
  ensureEndType(node, 'punctuation.definition.string.end.jome')
  let parts = node.parts.slice(1, -1)
  node.data = {parts}
}

function validateTag(node) { // A generic version of the heredoc. It is not yet clear how to call those things.
  if (node.type !== "meta.tag.jome") {
    pushError(node, `Internal error. A tag should always start with type meta.embedded.block. Was ${node.type}`)
  }
  ensureStartType(node, 'punctuation.definition.tag.begin.jome')
  if (node.parts[1].type !== "entity.name.tag.jome") {
    pushError(node, `Internal error. A tag have a name of type entity.name.tag.jome. Was ${node.parts[1].type}`)
  }
  let openingTagName = node.parts[1].raw
  let closingTagName = node.parts[node.parts.length-2].raw;
  if (openingTagName !== closingTagName) {
    pushError(node, `Internal error. Heredoc should always have a matching closing tage. Opening: ${openingTagName}. Closing: ${closingTagName}`)
  }
  let contentStartIdx = node.parts.findIndex(p => p.type === 'punctuation.definition.tag.end.jome')+1
  // TODO: Parse attributes
  let content = compileTokenRaw(node.parts.slice(contentStartIdx,-3))
  node.data = {content, tagName: openingTagName}
}

function popIf(list, condition) {
  if (condition && list.length > 0) {
    return list.shift();
  }
}

const ANALYZERS = {
  "meta.block.jome": (node) => {
    if (node.parts[0].type !== 'punctuation.curly-braces.open') {
      return pushError(node, "Internal error. meta.block.jome should always start with punctuation.curly-braces.open")
    }
    if (node.parts[node.parts.length-1].type !== 'punctuation.curly-braces.close') {
      return pushError(node, "Internal error. meta.block.jome should always end with punctuation.curly-braces.close")
    }
  },
  // obj->callFunc
  "meta.caller.jome": (node) => {
    if (node.operands.length !== 1) {
      return pushError(node, "Missing operand before arrow getter")
    }
  },
  // obj.property
  "meta.getter.jome": (node) => {
    // TODO: If the getter is an optional bracket getter (obj?.[0]), than validate what is inside the bracket too
    if (node.operands.length !== 1) {
      return pushError(node, "Missing operand before getter")
    }
  },
  // let foo
  // var bar
  'DECLARATION': (node) => {

    let data = groupByType(node.parts)
    let keyword = data['KEYWORD_DECLARATION']?.raw || "let"
    let name = data['VARIABLE']?.raw
    let variableType = data['TYPE']?.raw

    // let keyword = node.parts.find(p => p.type === 'KEYWORD_DECLARATION')?.raw || 'let'
    // let name = node.parts.find(p => p.type === 'VARIABLE')?.raw
    // let variableType = node.parts.find(p => p.type === 'TYPE')?.raw

    if (!name) { return pushError(node, "Missing variable name after keyword "+keyword) }

    pushBinding(node, name, {type: 'declaration', keyword, variableType, kind: BindingKind.Variable})
    node.data = {keyword, name, variableType}
  },

  'DO_END': (node) => {
    let args = node.parts.filter(p => p.type === 'ARGUMENT')
    let expressions = filterCommas(filterSpaces(node.parts.filter(
      p => p.type !== 'ARGUMENT'
    )))
    analyzeFUNCTION(node, null, args, expressions)
    node.data = {expressions, args}
  },

  "FUNCTION": (node) => {
    let nameNode = node.parts.find(p => p.type === 'FUNCTION_NAME')
    let name = nameNode?.raw
    let args = node.parts.filter(p => p.type === 'ARGUMENT')
    let isInline = !!node.parts.find(p => p.type === 'BEGIN_SECTION')
    let style = node.parts.find(p => p.type === 'FUNCTION_STYLE')?.raw
    let expressions = extractExpressionsFUNCTION(node, ['FUNCTION_NAME', 'ARGUMENT', 'BEGIN_SECTION', 'FUNCTION_STYLE'])
    // TODO: Return type
    if (style === 'def' && !name) {
      return pushError(node, "Missing function name")
    }

    analyzeFUNCTION(node, nameNode, args, expressions)

    node.data = {name, expressions, args, isInline}
  },

  // js uses more specifically:
  // keyword.operator.arithmetic.jome
  // keyword.operator.logical.jome
  // + - * / ^
  'keyword.operator.jome': validateOperator,
  'keyword.operator.existential.jome': validateOperator,
  //'keyword.operator.nullish-coalescing.jome'
  'keyword.operator.colon.jome': (node) => {
    if (node.operands.length !== 2) {
      return pushError(node, "A colon operator must have a two operands")
    }
    // A colon can we used for the else of a ternary, but also for creating an entry for a function call

    let t = node.operands[0].type
    if (t !== 'keyword.operator.existential.jome' && !t.startsWith("string") && t !== 'VARIABLE') {
      return pushError(node, `Invalid use of colon. Wrong left operand: `+t)
    }

    let child = node.operands[1]
    if (!OPERAND_TYPES.includes(child.type)) {
      return pushError(node, `Invalid operand type for operator ${node.type}. Was: ${child.type}`)
    }
    // node.data = {
    //   isTernary: node.operands[0].type === 'keyword.operator.existential.jome'
    // }
  },
  // =>
  'keyword.arrow.jome': (node) => {
    if (node.operands.length === 1) {
      // No args
      // TODO: Validate right side
    } else if (node.operands.length === 2) {
      // With args
      let t = node.operands[0].type
      if (!(t === 'meta.group.jome' || t === 'VARIABLE')) {
        return pushError(node, "Syntax error. Arrow function expects arguments at it's left side.")
      }
      // TODO: Validate right side
    } else {
      return pushError(node, "Syntax error. Arrow function expects one or two operands.")
    }
  },
  // !
  "keyword.operator.logical.unary.jome": validateOperatorUnary,
  "OP_AND": validateOperator,
  "OP_OR": validateOperator,
  // ==, !=, ===, !===
  'keyword.operator.comparison.jome': validateOperator,
  // statement if cond
  'keyword.control.inline-conditional.jome': (node) => {
    if (node.operands.length !== 2) {
      return pushError(node, "An inline condition must have a two operands")
    // } else if (!OPERAND_TYPES.includes(node.operands[1].type)) {
    //   return `Invalid value for assignement ${node.type}. Was: ${node.type}`
    }
  },
  // [1,2,3]
  // x[0]
  // called square-bracket because it can be an array or an operator
  "meta.square-bracket.jome": (node) => {
    if (node.parts[0].type !== 'punctuation.definition.square-bracket.begin.jome') {
      pushError(node, "Internal error. meta.square-bracket.jome should always start with punctuation.definition.square-bracket.begin.jome")
    }
    if (node.parts[node.parts.length-1].type !== 'punctuation.definition.square-bracket.end.jome') {
      pushError(node, "Internal error. meta.square-bracket.jome should always end with punctuation.definition.square-bracket.end.jome")
    }
    let isOperator = node.operands.length
    if (isOperator) {
      let items = filterNewlines(node.parts.slice(1,-1))
      if (items.length !== 1) {
        pushError(node, "Syntax error. Square bracket operator expects one and only one expression.")
      }
      node.data = {isOperator, operand: node.operands[0], expression: items[0]}
    } else {
      let elems = parseList(node.parts.slice(1,-1))
      node.data = {elems}
    }
  },
  "VARIABLE": (node) => {
    let name = node.raw
    pushOccurence(node, {name})
  },
  // =
  'ASSIGN': (node) => {
    if (node.operands.length !== 2) {
      return pushError(node, "An assignment must have a two operands")
    // } else if (!['KEYWORD_DECLARATION'].includes(node.operands[0].type)) {
    //   return `Invalid left hand side for assignement ${node.type}. Was: ${node.type}`
    // } else if (!OPERAND_TYPES.includes(node.operands[1].type)) {
    //   return `Invalid value for assignement ${node.type}. Was: ${node.type}`
    }
    
    if (node.operands[0].type === 'DECLARATION') {
      // Try to determine the type implicitely
      let binding = node.lexEnv.getBinding(node.operands[0].parts[1].raw)
      if (node.operands[1].type === 'constant.numeric.integer.jome') {
        binding.variableType = 'int'
      } else if (node.operands[1].type === 'constant.numeric.float.jome') {
        binding.variableType = 'float'
      } else if (node.operands[1].type.startsWith("string")) {
        binding.variableType = 'string'
      } else if (node.operands[1].type === 'constant.language.boolean.jome') {
        binding.variableType = 'bool'
      }
    }
  },
  // chain
  //   someFunc()
  //   someOtherFunc()
  // end
  "meta.chain.jome": (node) => {
    ensureStartRaw(node, 'chain')
    ensureStartType(node, 'keyword.control.jome')
    ensureEndRaw(node, 'end')
    ensureEndType(node, 'keyword.control.jome')
    ensureLhsOperand(node)
    let parts = filterNewlines(node.parts.slice(1,-1)) // remove chain, end keyword, and remove newlines
    ensureAllTypeIn(node, parts, ['FUNCTION_CALL', 'keyword.operator.assignment.jome'])
    node.data = {items: parts}
  },

  "IF_BLOCK": (node) => {
    let parts = filterNewlines(node.parts)
    let sections = [{keyword: "if", cond: parts[0], statements: extractExpressionsIF_BLOCK(node, parts.slice(1))}]
    let siblings = filterNewlines(node.parent.parts.slice(node.siblingIdx+1))
    for (let i = 0; i < siblings.length; i++) {
      let n = siblings[i]
      if (n.type !== "ELSIF_BLOCK" && n.type !== "ELSE_BLOCK") {break;}
      if (n.type === "ELSIF_BLOCK") {
        let ps = filterNewlines(n.parts)
        sections.push({keyword: "else if", cond: ps[0], statements: extractExpressionsIF_BLOCK(n, ps.slice(1))})
      } else {
        sections.push({keyword: "else", statements: extractExpressionsIF_BLOCK(n, filterNewlines(n.parts))})
      }
      analyzeNodes(n.parts)
      if (n.operands) {analyzeNodes(n.operands)}
      if (n.block) {analyzeNodes(n.block.parts)}
      n.analyzed = true
    }
    node.data = {sections}
  },

  "ELSIF_BLOCK": (node) => {
    pushError(node, "Unexpected elsif block, missing if block before.")
  },

  "ELSE_BLOCK": (node) => {
    pushError(node, "Unexpected else block, missing if block before.")
  },
  
  // handles all lines starting with keyword import
  "IMPORT": (node) => {

    let data = groupManyByType(node.parts)
    let defaultImport = data['DEFAULT_IMPORT']?.[0] // TODO: Validate no more than one
    let namespaceImport = data['NAMESPACE_IMPORT']?.[0] // TODO: Validate no more than one
    let aliasImports = data['ALIAS_IMPORT']
    let namedImports = data['NAMED_IMPORT']
    let useCjs = data['IMPORT_STYLE']?.[0]?.raw !== 'from'
    let importFile2 = data['IMPORT_FILE']?.[0] // TODO: Validate than no more than one
    
    if (!importFile2) {
      return pushError(node, "Missing filename in import statement.")
    }

    let importFilepath = importFile2.raw.slice(1, -1) // remove quotes
    pushFileLink(importFile2, importFilepath)

    let pushImport = (node, name, type, data={}) => {
      let kind = BindingKind.Variable
      if (name[0] === "&") {
        node.ctxFile.classIdentifiers.add(name.slice(1))
        name = name.slice(1)
        kind = BindingKind.Class
      }
      pushBinding(node, name, {name, type, file: importFilepath, kind, ...data})
    }

    // TODO: Instead of using the previous types, use the new ones directly (those in capital letters)
    // TODO: [defaultImport, namespaceImport, ...aliasImports, ...namedImports].forEach(p => {if (p) {pushImport(p)}})

    if (defaultImport) {
      let type = useCjs ? 'cjs-import' : 'default-import'
      pushImport(defaultImport, defaultImport.raw, type)
    }

    if (namespaceImport) {
      pushImport(namespaceImport, namespaceImport.raw, 'namespace-import')
    }

    if (aliasImports) {
      aliasImports.forEach(p => {
        let original = p.parts[0].raw
        let name = p.parts[1].raw
        pushImport(p, name, 'alias-import', {original})
      })
    }

    if (namedImports) {
      namedImports.forEach(p => {
        pushImport(p, p.raw, 'named-import')
      })
    }
  },

  "string.quoted.double.jome": (node) => validateString(node, '"'),
  "string.quoted.single.jome": (node) => validateString(node, "'"),
  "string.quoted.multi.jome": (node) => validateString(node, "'''"),
  "string.quoted.backtick.jome": (node) => validateString(node, '`'),

  "TEMPLATE_LITERAL": (node) => {
    if (node.parts.length !== 1) {
      return pushError(node, "Error a template literal should only contain a single expression.")
    }
    node.data = {code: node.parts[0]}
  },

  "FUNCTION_CALL": (node) => {

    let nameTok = node.parts.find(p => p.type === 'FUNCTION_NAME' || p.type === 'BUILT_IN')

    // FIXME: Update this old code
    let parts = node.parts.slice(1)
    let args = [];
    if (parts.length && parts[parts.length-1].type === 'DO_END') {
      args.push(parts[parts.length-1])
      parts = parts.slice(0, -1)
    }
    parts = filterNewlines(parts)
    ensureListSeparatedByCommas(node, parts)
    args = [...parts.filter((e, i) => i % 2 === 0), ...args]
  
    node.data = {nameTok, args}
  },

  "INLINE_FUNCTION_CALL": (node) => {

    let nameTok = node.parts.find(p => p.type === 'FUNCTION_NAME' || p.type === 'BUILT_IN')

    if (node.operands.length !== 1) {
      pushError(node, "Missing inline function call left operand")
    }

    // FIXME: Update this old code
    let parts = node.parts.slice(1)
    let args = [];
    if (parts.length && parts[parts.length-1].type === 'DO_END') {
      args.push(parts[parts.length-1])
      parts = parts.slice(0, -1)
    }
    parts = filterNewlines(parts)
    ensureListSeparatedByCommas(node, parts)
    args = [...parts.filter((e, i) => i % 2 === 0), ...args]
  
    node.data = {nameTok, args}
  },

  "meta.with-args.jome": (node) => {
    ensureStartRaw(node, 'with')
    ensureStartType(node, 'keyword.control.jome')
    let parts = node.parts.slice(1) // Remove 'with' keyword
    // Whether is is a with ... end block to define file arguments
    let isFileArguments = false
    let args = []
    if (node.parts[node.parts.length-1]?.raw === 'end') {
      isFileArguments = true
      parts = parts.slice(0, -1) // Remove 'end' keyword
    }
    parts = filterCommas(filterNewlines(parts))
    node.data = {isFileArguments, argsToken: parts}
  },

  "meta.trycatch.jome": (node) => {
    ensureStartRaw(node, 'try')
    ensureStartType(node, 'keyword.control.trycatch.jome')
    ensureEndRaw(node, 'end')
    ensureEndType(node, 'keyword.control.jome')
    let tryParts = []
    let catchParts = []
    let finallyParts = []
    let exceptionVar = null
    let catchKeywordFound = false
    let finallyKeywordFound = false
    let parts = filterNewlines(node.parts.slice(1,-1))
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i]
      // TODO: Assert that a single catch keyword and a single finally keyword found
      if (part.type === 'keyword.control.trycatch.jome') {
        if (part.raw === 'catch') {
          let next = parts[i+1]
          if (next.type === 'meta.group.jome' && next.parts[1].type === 'VARIABLE') {
            exceptionVar = next.parts[1].raw
            i += 1
          }
          catchKeywordFound = true
        } else if (part.type === 'keyword.control.trycatch.jome' && part.raw === 'finally') {
          finallyKeywordFound = true
        }
      } else if (finallyKeywordFound) {
        finallyParts.push(part)
      } else if (catchKeywordFound) {
        catchParts.push(part)
      } else {
        tryParts.push(part)
      }
    }
    // TODO: Assert that catch of finally is found
    node.data = {tryParts, catchParts, finallyParts, exceptionVar}
  },

  "meta.tag.jome": validateTag,

  "meta.include.jome": (node) => {
    let parts = node.parts.slice(2,-1) // Remove #, (, )
    let file = parts[0].raw.slice(1,-1) // Remove quotes
    let absPath = file;
    if (file[0] === '.') {
      absPath = path.resolve(node.ctxFile.absPath, '..', file)
    }
    if (!fs.existsSync(absPath)) {
      return pushError(node, "Missing file "+absPath)
    }
    // TODO: Try catch
    let content = fs.readFileSync(absPath)
    node.data = {content}
  },

  "meta.forall.jome": (node) => {
    ensureStartRaw(node, 'forall')
    ensureStartType(node, 'keyword.control.jome')
    ensureEndRaw(node, 'end')
    ensureEndType(node, 'keyword.control.jome')
    let tagName = node.parts[1].raw
    let parts = node.parts.slice(2,-1) // skip 2 keywords and tag name
    let chainFunctions = []
    let wrapFunctions = []
    parts.forEach(part => {
      if (part.type === 'meta.forall-chain.jome') {
        ensureStartRaw(part, 'chain')
        ensureStartType(part, 'keyword.control.jome')
        let funcs = part.parts.slice(1) // skip keyword chain
        funcs.forEach(func => {
          if (func.type !== 'entity.name.function.jome') {
            pushError(node, "sdf890230r23j0fj230f230ih")
          }
          chainFunctions.push(func.raw)
        })
      } else if (part.type === 'meta.forall-wrap.jome') {
        ensureStartRaw(part, 'wrap')
        ensureStartType(part, 'keyword.control.jome')
        let funcs = part.parts.slice(1) // skip keyword wrap
        funcs.forEach(func => {
          if (func.type !== 'entity.name.function.jome') {
            pushError(node, "df9h2890fh92uu9sbdf1sdlf")
          }
          wrapFunctions.push(func.raw)
        })
      }
    })
    node.data = {tagName, chainFunctions, wrapFunctions}
  },

  // class
  "meta.class.jome": (node) => {
    let name = node.parts[1].raw
    node.ctxFile.classIdentifiers.add(name)
    pushBinding(node.parts[1], name, {type: 'class', kind: BindingKind.Class})
    // let methods = parts.filter(p => p.type === 'meta.def.jome')
    // Do something with methods? Or it's handled somewhere else?
    node.data = {name}
  },
}

module.exports = {
  analyzeNodes,
  filterCommas,
  filterNewlines,
  filterSpaces
}
