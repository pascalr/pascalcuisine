function argv() {
  return ["jome", ...process.argv.slice(process.argv.indexOf("--") + 1)];
}

module.exports = argv