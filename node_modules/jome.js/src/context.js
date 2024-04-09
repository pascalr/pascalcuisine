const path = require('path')

const {DEFAULT_FORALLS} = require('./forall.js')

// The scope of the file. So it handles imports especially.
class ContextFile {
  constructor(absPath, outerEnvironment) {
    this.uidNb = 0
    this.absPath = absPath
    this.lexEnv = new LexicalEnvironment(outerEnvironment)
    this.lexEnv.ctxFile = this
    this.classIdentifiers = new Set() // The list of identifiers that refer to a class name
    this.dependencies = new Set() // Files that need to be compiled too for this file to run
    this.fileArguments = [] // A list of Argument
    this.currentArguments = null // The arguments defined just before classes and functions
    this.compiler = null // A reference to the compiler
    this.foralls = DEFAULT_FORALLS
    this.errors = [] // A list of errors found when analyzing
    this.fileImportDependenciesByFile = {}
    this.filesLinks = [] // The files linked from imports, every path, ... They can be duplicated. #./some_file.js multiple times will be inserted multiple times here
    this.symbols = [] // Something concrete like a function, a variable, a class, ...
    this.occurences = [] // Either a declaration or a usage of a symbol
    this.undeclaredOccurences = [] // Using a variable or other symbol when it has not been declared
    this.validOccurences = []
  }

  addFileImportDependency(name, type, file) {
    this.fileImportDependenciesByFile[file] = [...(this.fileImportDependenciesByFile[file]||[]), {name, type}]
  }

  addForall(name, chainFuncs, wrapFuncs) {
    this.foralls[name] = {chain: chainFuncs, wrap: wrapFuncs}
  }

  addDependency(filename) {
    this.dependencies.add(filename)
  }

  // Returns abs paths
  getDependencies() {
    return [...this.dependencies].map(dep => {
      return path.resolve(this.absPath, '..', dep)
    })
  }

  // Get unique identifier. Simply prefix j_uid_ than a number that goes up by one every time
  uid() {
    return `j_uid_${++this.uidNb}`
  }
}

const BindingKind = {
  Function: 1,
  Variable: 2,
  Class: 3,
}

// A local scope (inside a function, an if block, ...)
class LexicalEnvironment {
  constructor(outerEnvironment = null) {
    this.bindings = {};
    this.nestedEnvs = []
    this.outer = outerEnvironment;
    if (this.outer) {this.outer.nestedEnvs.push(this)}
  }

  hasBinding(name) {
    return this.getBinding(name) !== undefined
  }

  // Method to add variable bindings to the environment
  addBinding(name, value) {
    // TODO: Throw exception if the binding already exists in this lexical environment
    this.bindings[name] = {...value, name};
  }

  getBindingEnv(name) {
    if (name in this.bindings) {
      return this
    } else if (this.outer) {
      return this.outer.getBindingEnv(name)
    }
    return null
  }

  // Method to get the value of a variable from the environment
  getBinding(name) {
    return (this.getBindingEnv(name)?.bindings || this.bindings)[name]
    // throw new ReferenceError(`${name} is not defined.`);
  }

  // Returns all the bindings of itself and it's children
  getAllBindings() {
    let all = {...this.bindings}
    this.nestedEnvs.forEach(env => {
      all = {...all, ...env.getAllBindings()}
    })
    return all
  }
}

module.exports = {
  LexicalEnvironment,
  ContextFile,
  BindingKind
}