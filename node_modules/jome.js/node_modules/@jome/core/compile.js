const fs = require('fs')
const compileJomeFile = require('./lib/compile_jome_file.js')

/**
 * #compile
 * If the source file has been modified, compile and run it. Then save
 * it to the destination file.
 * TODO: Write the async version. Rename this one compileSync
 */
function compile(srcFile, options) {
  if (!srcFile.endsWith('.jome') && !srcFile.endsWith('.jomm')) {
    throw new Error("Can't #compile a file without .jome or .jomm extension.")
  }
  let destFile = srcFile.slice(0, -5) + '.js'
  if (!options.force) {
    if (fs.existsSync(destFile)) {
      // Check if the file needs to be compiled
      const srcStats = fs.statSync(srcFile);
      const destStats = fs.statSync(destFile);
      if (destStats.mtime.getTime() > srcStats.mtime.getTime()) {
        return; // File is already up to date
      }
    }
  }
  compileJomeFile(srcFile)
}

module.exports = compile