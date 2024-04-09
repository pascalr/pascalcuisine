//const {stringToPureJs} = require("jome-lib/formatting")

// class FuncRef {
//   constructor(name, filepath, isDefault) {
//     this.name = name
//     this.filepath = filepath
//     this.isDefault = isDefault
//   }
//}

// Define the defaults forall
const DEFAULT_FORALLS = {
  sh: {
    wrap: ["execSh"],
    imports: {execSh: {from: '@jome/core/execSh', namespace: true}}
  },
  md: {
    wrap: ["mdToHtml"],
    imports: {mdToHtml: {from: '@jome/md-to-html', namespace: true}}
  },
  // It seams to be very common to have two things, the language of the content, and how you want to process it.
  // What should be the standard convention? js-txt? txt.js? ex.js?
  // js.html would give me js, and the content would be html. I like that. It is familiar to file extension.
  // TODO: foo.js should be syntax highlighting in javascript.
  // Do I want js to be converted to pure javascript or do I want it to simply be a normal string by default?
  // js: {
  //   chain: [stringToPureJs],
  //   imports: {mdToHtml: {from: '@jome/md-to-html', default: true}}
  // },
}

module.exports = {
  DEFAULT_FORALLS
}