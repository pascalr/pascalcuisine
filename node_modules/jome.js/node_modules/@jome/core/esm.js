/* Here are functions used when compiling to ESM */

const { fileURLToPath } = require('url')
const path = require('path')
const compileJomeFile = require('./lib/compile_jome_file.js')

// For #filename
// Ex: filename(import.meta)
function dirname(importMeta) {
  return fileURLToPath(importMeta.url)
}

// For #dirname
// Ex: dirname(import.meta)
function dirname(importMeta) {
  return path.dirname(fileURLToPath(importMeta.url))
}

// This functions is called when compiling with ESM using jome paths like #./some_path.txt
// Ex: jomePath(import.meta, './some_path.txt')
// In CommonJS, it is simply path.join(__dirname, './some_path.txt');
function jomePath(importMeta, relPath) {
  return path.join(path.dirname(fileURLToPath(importMeta.url)), relPath);
}

// Same as cjs/run, but for ESM.
// FIXME: If you can run async multiple times on the same time, it will call jomec multiple times
// TODO: Find a way to cache and make sure that jomec and await import are executed only once.
async function runEsm(jomeFileAbsPath, ...args) {
  let jsFile = compileJomeFile(jomeFileAbsPath)
  let func = await import(jsFile)
  return func(...args)
}

module.exports = {
  jomePath,
  dirname,
  runEsm
}