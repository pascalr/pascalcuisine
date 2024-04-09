const { parse } = require("./parser")
const { tokenize } = require('./tokenizer.js')
const { genCode, genImports, genImportsFromBindings } = require("./code_generator.js")
const { analyzeNodes } = require("./analyzer")
const { ContextFile } = require("./context.js")
const prettier = require("@prettier/sync")
const JomeConfig = require('./jome_config.js')
//const prettier = require("prettier")

const fs = require('fs');
//const path = require('path');

function debugOpTree(node, depth = 0) {
  const indentation = '  '.repeat(depth);

  let res = `${indentation}${node.type}`

  for (const op of node.operands) {
    res += '\n' + debugOpTree(op, depth + 1);
  }

  return res
}

function debugTreeType(node, depth = 0) {
  const indentation = '  '.repeat(depth);

  let res = `${indentation}${node.type}`

  if (node.parts) {
    for (const part of node.parts) {
      res += '\n' + debugTreeType(part, depth + 1);
    }
  }

  for (const op of node.operands) {
    res += '\n' + debugTreeType(op, depth + 1);
  }

  return res
}

function printTree(node, depth = 0) {
  const indentation = '  '.repeat(depth);

  console.log(`${indentation}${node.raw}`);

  for (const child of node.operands) {
    printTree(child, depth + 1);
  }
}

// That a list of ASTNode and return js code
function compileNodes(nodes) {
  analyzeNodes(nodes)
  return nodes.map(node => {
    let compiled = genCode(node)
    return compiled
  }).join(';')+';'
  //return nodes.map(node => genCode(node)).join(';')+';'
}

function parseAndAnalyzeCode(code) {
  let compiler = new Compiler()
  let ctxFile = new ContextFile()
  ctxFile.compiler = compiler
  let tokens = [tokenize(code)]
  let topNodes = parse(tokens, null, ctxFile.lexEnv)
  analyzeNodes(topNodes, false)
  return {ctxFile, nodes: topNodes}
}

// Deprecated, use parseAndAnalyzeCode instead
function analyzeCode(code) {
  return parseAndAnalyzeCode(code).ctxFile
}

function compileCode(code, options) {
  return new Compiler(options).compileCode(code)
}

const DEFAULT_COMPILER_OPTIONS = {
  useCommonJS: true, // Whether imports and exports use common JS or ESM
  prettier: true, // Whether to format the code using the prettier library
  writeScript: true, // Whether to wrap the code inside a function to be exported
  inline: false, // Inside a script template literal the code is compiled inline for example
  useAbsImportPaths: true, // Whether to use require("/absolute/path/node_modules/foo/index.js") instead of require("foo")
  cwd: null // The current working directory. Used for useAbsImportPaths
}

class Compiler {
  // Config is the result of config.jome
  constructor(options={}, config) {
    this.options = {...DEFAULT_COMPILER_OPTIONS, ...options}
    this.filesCompiled = new Set()
    this.config = config || new JomeConfig()
  }

  compileFile(absPath) {
    console.log(`Compiling '${absPath}'...`);

    if (this.filesCompiled.has(absPath)) {
      console.log('Skipping compiling file', absPath, 'because it is already compiled.')
      return {}; // Skip files already compiled
    }
    if (!fs.existsSync(absPath)) {
      throw new Error("Can't compile and save missing file " + absPath)
    }

    if (!(absPath.endsWith('.jome')||absPath.endsWith('.jomm')||absPath.endsWith('.jomn'))) {
      throw new Error('Cannot compile file without .jome, .jomn or .jomm extension. ' + absPath);
    }
  
    // Read the contents of the file synchronously
    const data = fs.readFileSync(absPath, 'utf8');
    let ctxFile = new ContextFile(absPath, this.config?.lexEnv)
    let result = this.compileCode(data, this.options, ctxFile)
    return {result, ctxFile}
  }

  buildFile(absPath) {
    const destFile = absPath.slice(0,-5)+'.js' // remove .jome and replace extension with js

    // FIXME: This does not work because it does not check for dependencies.
    // If I want to do this, I must keep a dependency tree somewhere.
    // Or do I?
    // if (fs.existsSync(destFile)) {
    //   // Check if the file needs to be compiled
    //   const srcStats = fs.statSync(absPath);
    //   const destStats = fs.statSync(destFile);
    //   if (destStats.mtime.getTime() > srcStats.mtime.getTime()) {
    //     console.log('Skipping compiling file', absPath, 'because it is already up to date.')
    //     return; // File is already up to date
    //   }
    // }
  
    // Read the contents of the file synchronously
    const data = fs.readFileSync(absPath, 'utf8');
    let {result, ctxFile} = this.compileFile(absPath)

    if (!result) {return;} // Already compiled
  
    // Write the result to the file synchronously
    fs.writeFileSync(destFile, result);
    console.log(`Successfully wrote to '${destFile}'.`);

    this.filesCompiled.add(absPath)
    ctxFile.getDependencies().forEach(dep => {
      this.buildFile(dep)
    })
  
    return destFile
  }

  compileCode(code, options={}, ctxFile) {
    let opts = {...this.options, ...options}
    let tokens = [tokenize(code)]
    ctxFile = ctxFile || new ContextFile(null, this.config?.lexEnv)
    ctxFile.compiler = this
    ctxFile.compilerOptions = this.options // TODO: Get the options through the compiler, not compilerOptions
    let topNodes = parse(tokens, null, ctxFile.lexEnv)
    // let info = ""
    // topNodes.forEach(top =>
    //   info += '\n'+debugOpTree(top)
    // )
    // console.log(info)
    let body = compileNodes(topNodes)
    if (opts.inline) {
      if (opts.prettier) {
        let generated = prettier.format(body, {parser: "babel", semi: false}) // No semicolons
        return generated
      } else {
        return body.endsWith(';') ? body.slice(0, -1) : body // No semicolons
      }
    }
    if (opts.writeScript && ctxFile.absPath.endsWith('.jome')) {
      let args = ctxFile.fileArguments.map(arg => arg.compile()).join(', ')
      // Wrap the body into a function
      // FIXME: Don't allow exports when compiling a script (.jome)
      if (opts.useCommonJS) {
        body = `module.exports = ((${args}) => {${body}})`
      } else {
        body = `export default ((${args}) => {${body}})`
      }
    }
    let head = genImportsFromBindings(ctxFile, opts)
    let generated = head + body
    if (opts.prettier) {
      generated = prettier.format(generated, {parser: "babel"})
    }
    return generated
  }
}

function compileFileGetCtx(absPath, options) {
  let compiler = new Compiler(options)
  return compiler.compileFile(absPath)
}

function compileAndSaveFile(absPath, options, config) {
  let compiler = new Compiler(options, config)
  return compiler.buildFile(absPath)
}

module.exports = {
  compileCode,
  compileNodes,
  compileAndSaveFile,
  analyzeCode,
  compileFileGetCtx,
  parseAndAnalyzeCode
}