const Predicates = require('./predicates.js')
const DefaultTokenizerTable = require('./tokenizerTable.js')
const { InputStream, Tokenizer, Parser, Context, standardLibraryExtension } = require('./engine.js')

class Tesl {
  constructor(opts) {
    let options = opts || {}

    this.tokenizerTable = options.tokenizerTable || DefaultTokenizerTable(Predicates)
    this.context = new Context()

    standardLibraryExtension(this.context)
  }

  provide(name, extension) {
    this.context.__lib[name] = extension
  }

  execute(inputText) {
    let is = new InputStream(inputText)
    let t = new Tokenizer(is, this.tokenizerTable)
    let p = new Parser(t)

    return this.context.execute(p.parse())
  }
}

module.exports = {
  Tesl, Predicates, DefaultTokenizerTable, InputStream, Tokenizer, Parser, Context, standardLibraryExtension
}
