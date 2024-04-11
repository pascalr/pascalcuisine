const {spawnSync} = require("child_process");
const path = require("path");

// FIXME: If you can run async multiple times on the same time, it will call jomec multiple times
// TODO: Find a way to cache and make sure that jomec and await import are executed only once.
function compileJomeFile(jomeFileAbsPath) {
  // FIXME: Is this propper sanitize? I don't think so.
  let sanitized = path.resolve(jomeFileAbsPath)
  let child = spawnSync("jomec", [sanitized], { encoding: 'utf-8', stdio: 'inherit' })
  // FIXME: It's not working. When jomec throws an exception it does not exit here
  if(child.error) {
    throw new Error(child.error)
  }
  return jomeFileAbsPath.slice(0,-5)+'.js' // remove .jome and replace extension with js
}

module.exports = compileJomeFile