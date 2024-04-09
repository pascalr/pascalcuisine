#!/usr/bin/env node

// Jome CLI

// NAME:
// jome — Jome runtime
//
//
//

// SYNOPSIS:
// jome [options] [file] [arguments ...]
// jome [options] [arguments ...]
// jome [options]
//
//
//

// DESCRIPTION:
// Executes code written in the Jome programming language using node.js.
//
// Executing without arguments executes index.jome in the current directory.
// 
// If the first argument given ends with .jome extension, this file will be executed instead of index.jome.
//
// The rest of arguments are simply given to the executable.
//
//
//

// OPTIONS:
// -e "log('Hello')": Execute some code
// -v: Show Jome version
// -h: Show help message
// -u: update Jome?
//
//
//

const path = require('path');
const {compileAndSaveFile} = require('./compiler');
const {parseConfig} = require('./config_parser')
const { spawnSync } = require('child_process');
const minimist = require('minimist')

const args = minimist(process.argv.slice(2)); // Exclude the first two arguments (node executable and script file)

// Let's parse the config.jome file first
// TODO: Don't just check inside the current folder for config.jome. Go up the tree until you find one.
// So if you are inside a nested folder, you can still find config.jome
let config = parseConfig(path.resolve('config.jome'))

let wholeArgs = args._
let fileToRun = config.main
let executableArgs = wholeArgs

let {_, ...dashedArgs} = args
if (Object.keys(dashedArgs).length) {
  executableArgs = [...wholeArgs, dashedArgs]
}

if (wholeArgs[0]?.endsWith('.jome')) {
  fileToRun = wholeArgs[0]
  executableArgs = executableArgs.slice(1)
}

// The default is an empty object, this way you can always try to extract options
if (executableArgs.length <= 0) {
  executableArgs.push({})
}

let absPath = path.resolve(fileToRun)
compileAndExecute(absPath, executableArgs, config)

function compileAndExecute(absPath, args=[{}], config) {
  let buildFileName = compileAndSaveFile(absPath, {}, config)
  return require(buildFileName)(...args)
}

// FIXME
// I would like to be able to execute a file without creating an intermediary .js file, but it is not working.
// But the issue right now is that in spawn, __dirname is set to '.', and I can't seem to require. Paths are broken.
// const result = spawnSync('node', [], {
//   cwd: process.cwd(),
//   input: scriptCode,
//   encoding: 'utf-8',
// });
// function execute(absPath, args) {
  // let code = `require('${absPath}')(${args.map(a => JSON.stringify(a)).join(', ')})`
  // spawnSync('node', ['-e', code], { encoding: 'utf-8', stdio: 'inherit' });
// }

// TODO: use:
//
// const { spawn } = require('child_process');
// 
// const someCode = "console.log('hello')";
// 
// // Split the code into an array of arguments
// const codeArguments = ['-e', someCode];
// 
// // Spawn a new process with the node command and code arguments
// const nodeProcess = spawn('node', codeArguments);
// 
// // Listen for data on stdout and stderr
// nodeProcess.stdout.on('data', (data) => {
//   console.log(`stdout: ${data}`);
// });
// 
// nodeProcess.stderr.on('data', (data) => {
//   console.error(`stderr: ${data}`);
// });
// 
// // Listen for the process to exit
// nodeProcess.on('close', (code) => {
//   console.log(`Child process exited with code ${code}`);
// });