/**
 * An argument given to a function. Stores all the information about it.
 */
class Argument {
  constructor(name) {
    this.name = name
    this.type = null // A string with the type of the argument
    this.unit = null
    this.along = null
    this.defaultValue = null // As a string
    this.akas = []
    this.deconstructed = []
    this.isClassProperty = false // @someClassProperty
    this.docComment = null
  }

  isDeconstructed() {
    return !!this.deconstructed.length
  }

  compile() {
    if (this.isDeconstructed()) {
      return `{${this.deconstructed.map(arg => arg.compile()).join(', ')}}`
    } else {
      return this.name + (this.defaultValue ? ' = ' + this.defaultValue : '')
    }
  }
}

module.exports = Argument