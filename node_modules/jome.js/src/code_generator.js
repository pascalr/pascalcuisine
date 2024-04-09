const { compileUtility } = require("./compileUtility")
const {compileTokenRaw} = require("./parser.js")
const {filterCommas, filterNewlines, filterSpaces} = require("./analyzer.js")
const Argument = require("./argument")
const crypto = require('crypto');
const path = require('path')
const fs = require('fs')

const GLOBAL_PREFIX = 'g_'

function genCode(node) {
  if (!node) {
    throw new Error("Error invalid node was inexistant")
  }
  let generator = CODE_GENERATORS[node.type]
  if (!generator) {
    throw new Error("Can't compile node of type "+node.type)
  }
  return generator(node)
}

// Check env or above
// Imports should only be inside the highest level or above (Jome config lexical environment)
function extractImportBindingsByFile(lexEnv, acc={}) {
  Object.values(lexEnv.bindings).forEach(binding => {
    let t = binding.type
    if (t === 'default-import' || t === 'namespace-import' || t === 'named-import' || t === 'alias-import' || t === 'cjs-import') {
      acc[binding.file] = [...(acc[binding.file]||[]), binding]
    }
  })
  if (lexEnv.outer) {
    acc = extractImportBindingsByFile(lexEnv.outer, acc)
  }
  return acc
}

let GLOBAL_LIBS = ["assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns", "domain", "events",
"fs", "http", "https", "net", "os", "path", "punycode", "querystring", "readline", "stream", "string_decoder",
"timers", "tls", "tty", "url", "util", "v8", "vm", "zlib"]

function getLibMainFile(cwd, libName) {
  if (GLOBAL_LIBS.includes(libName)) {return libName}
  const packageJsonPath = path.resolve(cwd, `./node_modules/${libName}/package.json`);
  const packageJsonStr = fs.readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonStr);
  return path.resolve(cwd, `./node_modules/${libName}/`, packageJson.main);;
}

function genImportsFromBindings(ctxFile, compilerOptions) {

  // First add the bindings for all the file imports dependencies
  // TODO: Check if the name is already used and rename the import of required
  // FIXME: How does it work for code already generated???
  // This will have to be done in the analyze step so it can be done properly in the compile step!
  Object.keys(ctxFile.fileImportDependenciesByFile).forEach(file => {
    let imports = ctxFile.fileImportDependenciesByFile[file]
    ;(imports||[]).forEach(imp => {
      ctxFile.lexEnv.addBinding(imp.name, {...imp, file})
    })
  })




  let bindingsByFile = extractImportBindingsByFile(ctxFile.lexEnv)
  let files = Object.keys(bindingsByFile)
  let result = ""
  files.forEach(file => {
    let jsfile = file
    if (file.endsWith('.jomm') || file.endsWith('.jome') || file.endsWith('.jomn')) {
      ctxFile.addDependency(file)
      jsfile = file.slice(0,-5)+'.js' // remove .jome and replace extension with js
    } else if (compilerOptions.useAbsImportPaths && !path.extname(file) && compilerOptions.cwd) {
      jsfile = getLibMainFile(compilerOptions.cwd, file)
    }
    let bindings = bindingsByFile[file]
    let cjs = bindings.filter(b => b.type === 'cjs-import')[0]?.name
    let def = bindings.filter(b => b.type === 'default-import')[0]?.name
    // TODO: Support multiple default import names
    // Just declare a variable right under with the different default import name
    let named = bindings.filter(b => b.type === 'named-import').map(b => b.name)
    let aliases = bindings.filter(b => b.type === 'alias-import')
    aliases.forEach(alias => {
      let join = compilerOptions.useCommonJS ? ': ' : ' as '
      // TODO: Support multiple aliases
      named.push(`${alias.original}${join}${alias.name}`)
    })
    let namespace = bindings.filter(b => b.type === 'namespace-import')[0]?.name
    if (compilerOptions.useCommonJS) {
      if (cjs) {
        result += `const ${cjs} = require("${jsfile}");\n`
      } else if (namespace && def) {
        let uid = ctxFile.uid()
        result += `const ${uid} = require("${jsfile}");\nconst {default: ${def || ctxFile.uid()}, ...${namespace}} = ${uid};\n`
      } else if (namespace) {
        result += `const ${namespace} = require("${jsfile}");\n`
      } else if (def && named && named.length) {
        let uid = ctxFile.uid()
        result += `const ${uid} = require("${jsfile}");\nconst {default: ${def}, ${[...named].join(', ')}} = ${uid};\n`
      } else if (def && file.endsWith('.jome')) {
        result += `const ${def} = require("${jsfile}");\n`
      } else if (def) {
        let uid = ctxFile.uid()
        result += `const ${uid} = require("${jsfile}");\nconst ${def} = ${uid}.default;\n`
      } else {
        result += `const {${[...named].join(', ')}} = require("${jsfile}");\n`
      }
    } else {
      if (def) {
        result += `import ${def} from "${jsfile}";\n`
      } else {
        result += `import {${[...named].join(', ')}} from "${jsfile}";\n`
      }
    }
  })
  return result
}

function escapeTemplateLiteral(inputString) {
  return inputString.replace(/\$\{/g, '\u005c\$\{')
}

function escapeBackticks(inputString) {
  return inputString.replace(/\\*`/g, (s => {
    // If there is no or an even number of backslashes in front of the backtick, add one so it escapes the backtick.
    return (s === '`' || /^(\\\\)+/.test(s)) ? '\u005c'+s : s
  }))
}

function escapeDoubleQuotes(inputString) {
  return inputString.replace(/"/g, '\\"')
}

function compileOperatorUnary(node) {
  return `${node.raw}${genCode(node.operands[0])}`
}

function compileOperator(node) {
  return `${genCode(node.operands[0])} ${node.raw} ${genCode(node.operands[1])}`
}

function compileRaw(node) {
  return node.raw
}

function compileArgsV2(args) {
  let out = `(${args.map((a => {
    return a.raw // FIXMEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEe
  })).join(', ')})`
  return out
}

function compileArgs(node) { 
  if (node.type === 'VARIABLE') {
    return node.raw
  }
  let cs = node.parts.slice(1, -1) // remove vertical bars
  //let args = 
  //let todo = 10
  return `(${cs.map(c => genCode(c)).join('')})`
}

function compileEntry(node) {
  if (node.type === 'keyword.operator.colon.jome') {
    let name = node.operands[0].raw
    let value = genCode(node.operands[1])
    return `${name}: ${value}`
  } else {
    let name = node.parts[0].raw
    let value = genCode(node.operands[0])
    return `${name}: ${value}`
  }
}

function compileBlock(node) {
  let cs = filterNewlines(filterSpaces(filterCommas(node.parts.slice(1, -1)))) // remove curly braces
  if (cs.every(c => c.type === 'meta.dictionary-key.jome' || c.type === 'keyword.operator.colon.jome')) {
    return `({${cs.map(c => compileEntry(c))}})`
  }
  // A value is only on a single line, except if using parentheses.
  return '{}'
}

function compileArrowFunction(node) {
  if (node.operands.length > 1) {
    let args = node.operands[0]
    return `${compileArgs(args)} => (${node.operands.slice(1).map(c => genCode(c)).join('')})`
  } else {
    return `() => (${genCode(node.operands[0])})`
  }
}

function compileConstrutor(node) {
  let args = node.ctxFile.currentArguments
  if (args) {
    return `constructor(${args.map(a => a.compile()).join(', ')}) {
      ${args.filter(a => a.isClassProperty).map(a => {
        return `this.${a.name} = ${a.name}`
      }).join('\n')}  
    }\n`
    node.ctxFile.currentArguments = null
  }
  return ''
}

// A FUNCTION inside a class
function compileMethod(node) {

  let {name, args, expressions} = node.data
  if (args) {
    return `${name} = ${compileArgsV2(args)} => {\n${expressions.map(c => genCode(c)).join('')}}\n`
  } else {
    return `${name} = () => {\n${expressions.map(c => genCode(c)).join('')}\n}`
  }
}

function compileFUNCTION(node) {
  let {name, args, expressions} = node.data
  if (args) {
    return `function ${name||''}${compileArgsV2(args)} {${expressions.map(c => genCode(c)).join('')}}`
  } else {
    return `function ${name||''}() {${expressions.map(c => genCode(c)).join('')}}`
  }
}

function compileStandaloneFunction(node) {
  let cs = node.parts.slice(1,-1) // Remove keywords do and end
  let args = cs[0].type === 'ARGUMENTS' ? cs[0] : null
  if (args) {
    return `function ${compileArgs(args)} {${cs.slice(1).map(c => genCode(c)).join('')}}`
  } else {
    return `function () {${cs.map(c => genCode(c)).join('')}}`
  }
}

function toPrimitive(str) {
  // Check if the string represents an integer
  if (/^-?\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Check if the string represents a floating-point number
  if (/^-?\d+\.\d+$/.test(str)) {
    return parseFloat(str);
  }

  // Check if the string is a string
  if (str.startsWith('"') || str.startsWith("'")) {
    //return str.slice(1,-1)
    return str
  }

  if (str === 'true') {return true}
  if (str === 'false') {return false}

  throw new Error("TODO fas02934n890fhsn0n1")
}

function parseArgument(node) {
  if (node.type === 'ARGUMENT') {
    return new Argument(node.raw)
  } else if (node.type === 'ASSIGN') {
    let arg = parseArgument(node.operands[0])
    arg.defaultValue = genCode(node.operands[1])
    return arg
  } else if (node.type === 'meta.deconstructed-arg.jome') {
    let parts = filterCommas(filterNewlines(node.parts.slice(1,-1))) // Remove curly braces
    let arg = new Argument()
    parts.forEach(part => {
      arg.deconstructed.push(parseArgument(part))
    })
    return arg
  } else if (node.type === 'support.type.property-name.attribute.jome') {
    let arg = new Argument(node.raw.slice(1))
    arg.isClassProperty = true
    return arg
  } else {
    throw new Error("sf8923jr890shf89h2389r2h")
  }
}

// Combine all the named parameters given into a single object
function mergeNamedParameters(args) {
  let merged = []
  let obj = {}
  args.forEach(arg => {
    if (arg.type === 'keyword.operator.colon.jome') {
      obj[arg.operands[0].raw] = toPrimitive(genCode(arg.operands[1]))
    } else if (arg.type === 'SYMBOL_TRUE') {
      let name = arg.raw.slice(1, -1)
      obj[name] = 'true'
    } else if (arg.type === 'SYMBOL') {
      let name = arg.raw.slice(1)
      obj[name] = name
    } else {
      merged.push(arg)
    }
  })
  if (Object.keys(obj).length) {
    merged.push({type: "plain", raw: `{${Object.keys(obj).map(k => `${k}: ${obj[k]}`)}}`})
  }
  return merged
}

function compUtility(node) {
  let name = node.raw.slice(1)
  return compileUtility(name, node)
}

function compInlineUtility(node) {
  let name = node.raw.slice(2)
  let args = node.operands.map(c => genCode(c));
  return compileUtility(name, node, args)
}

// No dot before the func call
function compileFuncCall(node) {
  let tok = node.data.nameTok
  let isInlineUtil = tok.type === 'entity.name.function.utility-inline.jome' // .#
  if (tok.type === 'BUILT_IN' || tok.type === 'support.function.builtin.jome' || isInlineUtil) {
    let name = tok.raw.slice(isInlineUtil ? 2 : 1)
    let args = [...node.operands, ...mergeNamedParameters(node.data.args)].map(c => genCode(c));
    return compileUtility(name, node, args)
  }
  let called = genCode(node.data.nameTok)
  if (node.ctxFile.classIdentifiers.has(called)) {
    called = `new ${called}`
  }
  let args = mergeNamedParameters(node.data.args)
  let str = args.map(p => genCode(p)).join(', ')
  return `${called}(${str})`
}

// With a dot before the func call
function compileMetaFuncCall(node) {
  return `${genCode(node.operands[0])}.${compileFuncCall(node)}`
}

function compileHeredoc(node) {
  return applyFormat(node.data.tagName, node)
}

// Convert an heredoc into an array of array.
function prepareHeredoc(node) {
  let raw = node.data.content
  //let pattern = /(?<!\\)((<%.*?%>)|(<%=.*?%>)|(<%s.*?%>))/g;
  let pattern = /(?<!\\)(<%=.*?%>|<%s.*?%>)/g;
  // FIXME: Why do I get some undefined?
  let parts = raw.split(pattern).filter(f => f).map(s => {
    if (s.startsWith('<%s')) {return {sub: s.slice(3, -2).trim()}}
    if (s.startsWith('<%=')) {return {code: s.slice(3, -2).trim()}}
    return s.startsWith('<%') ? {code: s.slice(2, -2)} : s
  })
  let lines = []
  let currentLine = []
  parts.forEach(part => {
    if (typeof part === 'string' && part.includes('\n')) {
      let [first, ...ls] = part.split('\n')
      let last = ls[ls.length-1]
      ls = ls.slice(0, -1)
      currentLine.push(first)
      lines.push(currentLine)
      lines = [...lines, ...ls.map(l => [l])]
      currentLine = last ? [last] : []
      return;
    }
    currentLine.push(part)
  })
  if (currentLine.length) {
    lines.push(currentLine)
  }
  return lines
}

// Convert the node (string.quoted...) to an array of array for formats to chain.
function prepareFormatting(node) {
  if (node.type === 'VARIABLE') {
    return [[{code: node.raw}]]
  }
  if (node.type === "meta.tag.jome") {
    return prepareHeredoc(node)
  }
  let currentLine = []
  let currentStr = "" // Used merge raw with escape characters
  let lines = []
  node.data.parts.forEach(part => {
    if (part.type === 'raw') {
      currentStr += part.raw
    } else if (part.type === 'TEMPLATE_LITERAL') {
      if (currentStr.length) {currentLine.push(currentStr); currentStr = ""}
      currentLine.push({tokens: part.data.code})
    } else if (part.type === 'newline') {
      if (currentStr.length) {currentLine.push(currentStr); currentStr = ""}
      lines.push(currentLine)
      currentLine = []
    } else if (part.type === 'constant.character.escape.jome') {
      currentStr += part.raw
    } else {
      throw new Error("r90whr7903hg09rua089rg239")
    }
  })
  if (currentStr.length) {currentLine.push(currentStr); currentStr = ""}
  lines.push(currentLine)
  return lines
}

// Convert the array of array for formats into a string
function printFormatting(lines, ctxFile) {
  let substitutions = {}
  // If pure code
  if (lines.length === 1 && lines[0].length === 1 && typeof lines[0][0] !== 'string') {
    return {result: lines[0][0].code, substitutions}
  }
  // Otherwise it is a string
  let strIsTemplateLiteral = lines.length > 1;
  let result = lines.map(line => {
    return line.map(part => {
      let isTemplateLiteral = (typeof part !== 'string')
      strIsTemplateLiteral = strIsTemplateLiteral || isTemplateLiteral
      if (!isTemplateLiteral) {return escapeTemplateLiteral(part)}
      if (part.tokens) {return "${"+genCode(part.tokens)+"}"}
      if (part.code) {return "${"+ctxFile.compiler.compileCode(part.code, {inline: true})+"}"}
      if (part.sub) {
        let hash = crypto.createHash('md5').update(part.sub).digest("hex")
        substitutions[hash] = part.sub
        return hash
      }
      throw new Error("sf9dh29hf90shf98h3921")
    }).join('')
  }).join('\n')
  if (strIsTemplateLiteral) {
    result = `\`${escapeBackticks(result)}\``
  } else {
    result = `"${escapeDoubleQuotes(result)}"`
  }
  return {result, substitutions}
}

function applyFormat(format, operand) {
  let configFormat = operand.ctxFile.compiler.config.formats[format]
  if (configFormat) {
    let todo = 10
    let foo = 20
  }
  let forall = operand.ctxFile.foralls[format]
  let lines = prepareFormatting(operand)
  if (forall?.chain?.length) {
    forall.chain.forEach(chainFunc => {
      lines = chainFunc(lines)
    })
  }
  let {result, substitutions} = printFormatting(lines, operand.ctxFile)
  if (forall?.wrap?.length) {
    forall.wrap.forEach(wrapFunc => {
      result = `${wrapFunc}(${result})`
    })
  }
  Object.keys(substitutions).forEach(hash => {
    let subCode = operand.ctxFile.compiler.compileCode(substitutions[hash], {inline: true})
    result = result + `.replace('${hash}', ${subCode})`
  })
  Object.keys(forall?.imports||{}).forEach(impName => {
    let imp = forall.imports[impName]
    let type = imp.namespace ? 'namespace-import' : (imp.default ? 'default-import' : 'named-import')
    operand.ctxFile.addFileImportDependency(impName, type, imp.from)
  })
  return result
}

const CODE_GENERATORS = {
  "plain": (node) => node.raw,
  "comment.line.documentation.jome": (node) => `// ${node.raw.slice(2)}`,
  'comment.block.jome': () => "",
  'MD_CELL': () => "",
  'comment.line.double-slash.jome': () => "",
  'newline': () => '\n',
  'punctuation.terminator.statement.jome': compileRaw,
  'punctuation.separator.delimiter.jome': compileRaw,
  "string.quoted.backtick.verbatim.jome": (node) => `\`${node.token.children[1]}\``,
  "string.quoted.double.verbatim.jome": (node) => `"${node.token.children[1]}"`,
  "string.quoted.single.jome": (node) => applyFormat("single_quote", node),
  "string.quoted.double.jome": (node) => applyFormat("double_quote", node),
  "string.quoted.multi.jome": (node => {
    if (node.raw[0] === '"') {return applyFormat("triple_double_quote", node)}
    return applyFormat("triple_single_quote", node)
  }),
  //"string.quoted.backtick.jome": (node) => compileTokenRaw(node.token),
  "string.quoted.backtick.jome": (node) => applyFormat("backtick_quote", node),
  // "string.quoted.backtick.jome": (node, ctx) => {
  //   return '`'+node.children.slice(1,-1).map(c => c.type === 'newline' ? '\n' : c).map(
  //     c => typeof c === 'string' ? c : '${'+compileJsBlock(c.children.slice(1,-1), ctx)+'}'
  //   ).join('')+'`'
  // },
  // foo:
  "meta.dictionary-key.jome": (node) => {
    let foo = "bar"
    return `${node.parts[0].raw} ${node.parts[1].raw}`
  },
  "meta.block.jome": compileBlock,
  'constant.language.jome': compileRaw,
  // obj->callFunc
  "meta.caller.jome": (node) => {
    let funcName = node.parts[1].raw
    return `${genCode(node.operands[0])}.${funcName}()`
  },
  // obj.property
  "meta.getter.jome": (node) => {
    return `${genCode(node.operands[0])}${node.raw}`
  },
  // async
  "keyword.control.flow.jome": (node) => {
    return `await ${genCode(node.operands[0])}`
  },
  "storage.modifier.async.jome": (node) => {
    return `async ${genCode(node.operands[0])}`
  },
  // await
  'meta.group.jome': (node) => {
    // If a function call
    if (node.operands) {
      return `${node.operands.map(c => genCode(c)).join('')}${node.raw}`
    }
    // If simply a group
    return node.raw
  },
  'VARIABLE': compileRaw,
  'ARGUMENT': compileRaw,
  'FUNCTION_NAME': compileRaw,
  'variable.assignment.jome': (node) => {
    if (node.raw[0] === '$') {
      return `global.${GLOBAL_PREFIX}${node.raw.slice(1)}`
    }
    return node.raw
  },
  'support.variable.jome': compileRaw,
  'entity.name.function.jome': compileRaw,
  'constant.numeric.integer.jome': compileRaw,
  'constant.numeric.float.jome': compileRaw,
  'constant.language.boolean.jome': compileRaw,
  "string.regexp.js": compileRaw,
  // let foo
  // var bar
  'DECLARATION': (node) => {
    return `${node.data.keyword} ${node.data.name}`
  },
  // do |args| /* ... */ end
  'DO_END': compileFUNCTION,
  'FUNCTION': compileFUNCTION,
  'IF_BLOCK': (node) => {
    return node.data.sections.map(sect => {
      return `${sect.keyword} ${sect.cond ? `(${genCode(sect.cond)})` : ''} {${sect.statements.map(c => genCode(c)).join(';')}}`
    }).join(' ');
  },
  'ELSIF_BLOCK': (node) => {return ''}, // Handled inside IF_BLOCK
  'ELSE_BLOCK': (node) => {return ''}, // Handled inside IF_BLOCK
  'BEGIN_SECTION': (node) => {return ''},
  "entity.name.function.utility-inline.jome": (node) => compInlineUtility(node), // "Hello".#log  
  'support.function.builtin.jome': (node) => compUtility(node), // #log
  'BUILT_IN': (node) => compUtility(node), // #log
  "variable.other.constant.utility.jome": (node) => compUtility(node), // #PI
  "FUNCTION_CALL": compileFuncCall, // someFunc("some arg")
  "INLINE_FUNCTION_CALL": compileMetaFuncCall, // .someFunc("some arg")
  // js uses more specifically:
  // keyword.operator.arithmetic.jome
  // keyword.operator.logical.jome
  // + - * / ^
  'keyword.operator.jome': compileOperator,
  'keyword.operator.existential.jome': (node) => {
    return `${genCode(node.operands[0])} ? ${genCode(node.operands[1])} : null`
  },
  //'keyword.operator.nullish-coalescing.jome'
  'keyword.operator.colon.jome': (node) => {
    return `${genCode(node.operands[0].operands[0])} ? ${genCode(node.operands[0].operands[1])} : ${genCode(node.operands[1])}`
  },
  // class
  "meta.class.jome": (node) => {
    let {name} = node.data
    let parts = node.parts.slice(2,-1)
    let methods = parts.filter(p => p.type === 'FUNCTION')
    let compiledMethods = compileConstrutor(node)
    compiledMethods += methods.map(m => compileMethod(m)).join('\n')
    return `class ${name} {\n${compiledMethods}\n}`
  },
  // interface
  "meta.interface.jome": (node) => {
    // TODO: Parser les interfaces simplement une ligne à la fois. Un item par ligne.
    // interface GlobalAttributes
    //   accesskey?
    //   autocapitalize?
    //   autofocus?
    //   class?
    // end
    throw new Error("TODO interface")
  },
  // =>
  'keyword.arrow.jome': compileArrowFunction,
  // !
  "keyword.operator.logical.unary.jome": compileOperatorUnary,
  // || &&
  "OP_OR": compileOperator,
  "OP_AND": compileOperator,
  // ==, !=, ===, !===
  'keyword.operator.comparison.jome': compileOperator,
  // statement if cond
  'keyword.control.inline-conditional.jome': (node) => {
    return `if (${genCode(node.operands[1])}) {${genCode(node.operands[0])}}`
  },
  // [1,2,3]
  // x[0]
  // called square-bracket because it can be an array or an operator
  "meta.square-bracket.jome": (node) => {
    let {isOperator, operand, expression, elems} = node.data
    if (isOperator) {
      return `${genCode(operand)}[${genCode(expression)}]`
    } else {
      return `[${elems.map(c => genCode(c)).join('')}]`
    }
  },
  // exec
  //   someFunc()
  //   someOtherFunc()
  // end
  "meta.chain.jome": (node) => {

    let items = node.data.items
    if (items.length < 1) {
      return genCode(node.operands[0])
    }
    if (items.length === 1) {
      return genCode(node.operands[0])+'.'+genCode(items[0])
    }
    
    let lastItem = items[items.length-1]
    let otherCalls = items
    if (lastItem.type === 'ASSIGN') {
      lastItem = null
    } else {
      otherCalls = items.slice(0, -1)
    }
    

    return `(() => {
  let __chain = ${genCode(node.operands[0])}
  ${otherCalls.map(call => '__chain.'+genCode(call)).join('\n')}
  ${lastItem ? `return __chain.${genCode(lastItem)}` : ''}
})()`
  },
  // =
  'ASSIGN': compileOperator,
  //'ASSIGN': (node) => (compileOperator(node)+";"),
  // let
  'KEYWORD_DECLARATION': (node) => `let ${node.operands[0].raw}`,

  // handles all lines starting with keyword import
  "IMPORT": () => {
    // Nothing to do, already handled by analyzer
  },

  // #.
  // #./
  // #./some_file.ext
  // #/path/to/file.ext
  // #cwd/some_file.ext
  "string.other.path.jome": (node) => {
    let p = node.raw.slice(1)
    if (p === '.' || p === './') {
      if (!node.compilerOptions.useCommonJS) {
        throw new Error("sf823yf78902y30f9823323f")
      }
      return '__dirname'
    }
    if (p[0] === '/') {
      return `"${p}"`
    }
    node.ctxFile.addFileImportDependency('path', 'namespace-import', 'path')
    if (p.startsWith('cwd/')) {
      return `path.resolve("./${p.slice(4)}")`
    }
    if (!node.compilerOptions.useCommonJS) {
      throw new Error("fu3h7f23h98rfha07hd0237230u")
    }
    if (p.startsWith('..')) {
      return `path.join(__dirname, "${p}")`
    }
    return `path.join(__dirname, "${p.slice(2)}")`
  },

  "keyword.control.return.jome": (node) => {
    return 'return '+genCode(node.operands[0])+';'
  },
  "keyword.control.throw.jome": (node) => {
    return 'throw '+genCode(node.operands[0])+';'
  },
  "keyword.operator.new.jome": (node) => {
    return 'new '+genCode(node.operands[0])+';'
  },

  // <anything></anything>
  "meta.tag.jome": compileHeredoc,

  "meta.with-args.jome": (node) => {
    let current; let args = []
    node.data.argsToken.forEach(a => {
      // TODO: Allow two ways of commenting, either a single inline after, or multiple lines before
      // # Some doc
      // # For arg
      // arg
      // OR
      // arg # Some doc
      // I am only supporting the single inline after for now
      if (a.type === 'comment.line.documentation.jome') {
        if (current) {
          current.docComment = a.raw.slice(2)
        }
      } else {
        current = parseArgument(a);
        args.push(current)
      }
    })
    if (node.data.isFileArguments) {
      node.ctxFile.fileArguments = args
    } else {
      node.ctxFile.currentArguments = args
      if (args.length) {
        return `/**
${args.map(a => `* @param {*} ${a.name} ${a.docComment||''}`).join('\n')}
*/`
      }   
    }
    return ''
  },

  "keyword.control.main.jome": (node) => {
    if (node.compilerOptions.useCommonJS) {
      return `module.exports = ${genCode(node.operands[0])}`
    } else {
      return `export default ${genCode(node.operands[0])}`
    }
  },

  "support.type.property-name.attribute.jome": (node) => {
    return `this.${node.raw.slice(1)}`
  },

  // $GLOBAL_VARIABLE
  "variable.other.global.jome": (node) => {
    // Adding an underscore so the name does not collide with Node.js default variables (ex: URL)
    // https://nodejs.org/api/globals.html#url
    return `global.${GLOBAL_PREFIX}${node.raw.slice(1)}`
  },

  "keyword.other.string-format.jome": (node) => {
    return applyFormat(node.raw.slice(1), node.operands[0])
  },

  "meta.trycatch.jome": (node) => {
    let {tryParts, catchParts, finallyParts, exceptionVar} = node.data
    let result = `try {\n ${tryParts.map(p => genCode(p)).join('')}\n}`
    if (catchParts.length || exceptionVar) {
      result += ` catch${exceptionVar ? ` (${exceptionVar})` : ''} {\n ${catchParts.map(p => genCode(p)).join('')}\n}`
    }
    if (finallyParts.length) {
      result += ` finally {\n ${finallyParts.map(p => genCode(p)).join('')}\n}`
    }
    return result
  },
  "meta.try-block.jome": (node) => {
    let idx = node.parts.findIndex(p => p.type === 'meta.catch.jome' || p.type === 'meta.finally.jome')
    let tryParts = node.parts.slice(1, idx)
    // TODO: Make sure that after idx there is only meta.catch.jome or meta.finally.jome
    let afterParts = filterNewlines(node.parts.slice(idx, -1))
    return `try {\n ${tryParts.map(p => genCode(p)).join('')}\n}${afterParts.map(p => genCode(p)).join('')}`
  },
  "meta.try.jome": (node) => {
    return `try {\n ${node.parts.slice(1).map(p => genCode(p)).join('')}\n}`
  },
  "meta.catch.jome": (node) => {
    let e = (node.parts[1].type === 'variable.other.exception.jome') ? node.parts[1].raw : null
    let elems = node.parts.slice(e ? 2 : 1)
    return `catch${e ? ` (${e})` : ''} {\n ${elems.map(p => genCode(p)).join('')}\n}`
  },
  "meta.finally.jome": (node) => {
    return `finally {\n ${node.parts.slice(1).map(p => genCode(p)).join('')}\n}`
  },

  "CODE_BLOCK": (node) => {
    return ` {\n${node.parts.map(c => genCode(c)).join('')}}\n`
  },

  "meta.require.jome": (node) => {
    let parts = node.parts.slice(2,-1) // Remove #, (, )
    let file = parts[0].raw.slice(1,-1) // Remove quotes
    let args = filterCommas(filterNewlines(parts.slice(1)))
    if (file.endsWith('.jome')) {
      node.ctxFile.addDependency(file)
      file = file.slice(0, -5)+'.js'
      return `require("${file}")(${args.map(a => genCode(a)).join(',')})`
    } else if (file.endsWith('.js')) {
      return args?.length ? `require("${file}")(${args.map(a => genCode(a)).join(',')})` : `require("${file}")`
    } else {
      throw new Error("Required file not supported yet: "+file)
    }
  },

  "source.jome": (node) => {
    return `${node.parts.map(c => genCode(c)).join(';\n')}\n`
  },

  "meta.include.jome": (node) => {
    return `\`${node.data.content}\``
  },

  "meta.forall.jome": (node) => {
    let {tagName, chainFunctions, wrapFunctions} = node.data
    // Get the actual referenced function
    let chainFuncs = (chainFunctions||[]).map(chainFunc => {
      let binding = node.lexEnv.getBinding(chainFunc)
      if (!binding) {
        throw new Error("Missing forall chain function "+chainFunc)
      }
      if (binding.type === 'named-import') {
        let required = require(binding.file)
        return required[chainFunc]
      } else if (binding.type === 'default-import') {
        return require(binding.file)
      } else {
        throw new Error("sfh80h23f023hf0hw0irhf230")
      }
    })
    // TODO: get the source of the chain and wrap functions and add to the forall import list.
    node.ctxFile.addForall(tagName, chainFuncs, wrapFunctions)
    return ''
  },

}

module.exports = {
  genImportsFromBindings,
  genCode
}
