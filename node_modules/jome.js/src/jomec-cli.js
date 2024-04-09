#!/usr/bin/env node

// Compiles the given jome file and it's dependencies.

const { globSync } = require('glob')

const { compileAndSaveFile } = require('./compiler.js');
const path = require('path');

const args = process.argv.slice(2); // Exclude the first two arguments (node executable and script file)

if (args.length < 1) {
  throw new Error("jomec expects one jome source file glob")
} else if (args.length > 1) {
  throw new Error("jomec expects only one jome source file glob for now") // TODO: Allow multiple files to be compiled in the same command
}

const cwd = process.cwd()
let files = globSync(args[0])
files.forEach(fileName => {
  const fullPath = fileName[0] === '/' ? fileName : path.join(cwd, fileName)
  compileAndSaveFile(fullPath)
})