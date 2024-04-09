const compileJomeFile = require('./lib/compile_jome_file.js')

// Same as esm/run, but for CommonJS.
function runCjs(jomeFileAbsPath, ...args) {
  let jsFile = compileJomeFile(jomeFileAbsPath)
  let func = require(jsFile)
  let val = func(...args)
  return val
}

module.exports = {
  runCjs
}