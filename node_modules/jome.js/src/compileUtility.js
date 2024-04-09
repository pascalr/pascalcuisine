// FIXME: Change the name of imports and functions when there is name clashes.

const path = require('path')

function _run(node, sync, args) {
  if (args[0][0] === '"' || args[0][0] === "'") {
    let filepath = args[0].slice(1,-1)
    let name = 'run_'+path.parse(filepath).name.replace(/\./g, '_');
    node.ctxFile.addDependency(filepath)
    if (!filepath.endsWith('.jome')) {
      throw new Error('Cannot run file without .jome extension. Was: '+filepath);
    }
    let jsFile = filepath.slice(0,-5)+'.js' // remove .jome and replace extension with js
    node.ctxFile.addFileImportDependency(name, 'namespace-import', jsFile)
    // node.ctxFile.addImport(name, null, jsFile)
    let str = `${name}(${args.slice(1).join(', ')})`
    return sync ? `await ${str}` : `${str}`
    // TODO: Pass the rest of the args too into the function call
  } else {
    throw new Error('Dynamic #run not supported for now')
    let lib = node.ctxFile.compilerOptions.useCommonJS ? 'cjs' : 'esm'
    let str = `run(${args.join(', ')})`
    node.ctxFile.addImport(null, ['run'], 'jome-lib/'+lib)
    return sync ? `await ${str}` : `${str}`
  }
}

function handleTrim(trimFunction, args) {
  if (args.length === 0) {
    return `((str) => str.${trimFunction}())`
  } else if (args.length === 1) {
    return `${args[0]}.${trimFunction}()`
  } else {
    throw new Error(`#${trimFunction} expects only no or one argument`)
  }
}

// TODO: Add validations (type, kind of arguments allowed, etc)
const UTILS = {
  log: (node, args) => `console.log(${(args).join(', ')})`,
  keys: (node, args) => `Object.keys(${(args).join(', ')})`,
  values: (node, args) => `Object.values(${(args).join(', ')})`,
  entries: (node, args) => `Object.entries(${(args).join(', ')})`,
  PI: () => "Math.PI",
  env: () => "process.env",
  global: () => `globalThis`,
  argv: () => "process.argv",
  // FIXME: Ensures has one and only one arg
  trim: (node, args) => {handleTrim('trim', args)},
  strim: (node, args) => {handleTrim('trimStart', args)},
  trimStart: (node, args) => {handleTrim('trimStart', args)},
  etrim: (node, args) => {handleTrim('trimEnd', args)},
  trimEnd: (node, args) => {handleTrim('trimEnd', args)},
  // argv: (node) => {
  //   node.ctxFile.addImport('argv', null, 'jome-lib/argv')
  //   return `argv()`
  // },
  write: (node, args) => {
    node.ctxFile.addFileImportDependency('write', 'named-import', '@jome/core')
    // node.ctxFile.addImport(null, ['write'], '@jome/core')
    return `write(${(args).join(', ')})`
  },
  "write!": (node, args) => {
    node.ctxFile.addFileImportDependency('writeSync', 'named-import', '@jome/core')
    // node.ctxFile.addImport(null, ['writeSync'], '@jome/core')
    return `writeSync(${(args).join(', ')})`
  },
  cp: (node, args) => {
    node.ctxFile.addFileImportDependency('fs', 'namespace-import', 'fs')
    // node.ctxFile.addImport('fs', null, 'fs')
    return `fs.copyFile(${(args).join(', ')})`
  },
  "cp!": (node, args) => {
    node.ctxFile.addFileImportDependency('fs', 'namespace-import', 'fs')
    // node.ctxFile.addImport('fs', null, 'fs')
    return `fs.copyFileSync(${(args).join(', ')})`
  },
  run: (node, args) => _run(node, false, args),
  "run!": (node, args) => _run(node, true, args),
  load: (node, args) => _run(node, false, args),
  "load!": (node, args) => _run(node, true, args),
  // TODO: build!
  build: (node, args) => {
    node.ctxFile.addFileImportDependency('build', 'named-import', '@jome/core')
    // node.ctxFile.addImport(null, ['build'], '@jome/core')
    return `build(${(args).join(', ')})`
  },
  // TODO: compile!
  compile: (node, args) => {
    node.ctxFile.addFileImportDependency('compile', 'named-import', '@jome/core')
    // node.ctxFile.addImport(null, ['compile'], '@jome/core')
    return `compile(${(args).join(', ')})`
  },
  mdToHtml: (node, args) => {
    node.ctxFile.addFileImportDependency('mdToHtml', 'namespace-import', '@jome/md-to-html')
    // node.ctxFile.addImport('mdToHtml', null, '@jome/md-to-html')
    return `mdToHtml(${(args).join(', ')})`
  },
  execSh: (node, args) => {
    node.ctxFile.addFileImportDependency('execSh', 'named-import', '@jome/core')
    // node.ctxFile.addImport(null, ['execSh'], '@jome/core')
    return `execSh(${(args).join(', ')})`
  },
}

function compileUtility(name, node, args) {
  let utils = UTILS[name]
  if (!utils) {
    throw new Error("Unkown util "+name)
  }
  return `${utils(node, args||[])}`
}

module.exports = {
  compileUtility
}