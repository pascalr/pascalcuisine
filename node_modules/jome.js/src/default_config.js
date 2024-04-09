
// Work in progress

module.exports = {
  main: "index.jome",
  formats: {
    sh: {
      wrap: (...args) => {require("@jome/core/execSh")(...args)},
    },
    md: {
      wrap: (...args) => {require("@jome/core/md-to-html")(...args)},
    }
  }
}