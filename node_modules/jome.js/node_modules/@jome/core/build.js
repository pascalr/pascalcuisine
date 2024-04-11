const fs = require('fs')
const {run} = require('./cjs.js')

/**
 * #build
 * If the source file has been modified, compile and run it. Then save
 * it to the destination file.
 * TODO: Write the async version. Rename this one buildSync
 */
function build(srcFile, destFile, options) {
  if (!srcFile.endsWith('.jome')) {
    throw new Error("Can't #compile a file with .jome extension.")
  }
  if (!destFile) {
    destFile = srcFile.slice(0, -5)
  }
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
  let out = run(srcFile, ...(options.args||[]))
  fs.writeFile(destFile, out, 'utf8', (err) => handleError(err, options));
  // fs.writeFileSync(destFile, out);
}

// FIXME: Duplicate in write.js too. Put this in a separate file handleError.js
function handleError(err, options) {
  if (err && options.error) {
    options.error(err) // Error callback
  } else if (!err && options.success) {
    options.success() // Success callback
  }
}

module.exports = build