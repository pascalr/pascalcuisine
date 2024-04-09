const {LexicalEnvironment} = require('./context.js')

class JomeConfig {
  constructor(data) {
    this.lexEnv = new LexicalEnvironment()
    this.data = data||{}
    this.main = this.data.main || 'index.jome'
    this.formats = {}
  }
}

module.exports = JomeConfig