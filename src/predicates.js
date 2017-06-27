let Predicates = module.exports = {
  isWhitespace: (input) => {
    return ' \t\n\r'.indexOf(input) >= 0
  },  
  isTypeDeclarationStart: (input) => {
    return input === ':'
  },  
  isTypeDeclaration: (input) => {
    return Predicates.isIdentifier(input)
  },
  isNewline: (input) => {
    return input === '\n'
  },  
  isQuote: (input) => {
    return input === '"'
  },  
  isDigit: (input) => {
    return /[0-9]/i.test(input)
  },  
  isCommentStart: (input) => {
    return input === '<'
  },
  isCommentEnd: (input) => {
    return input === '>'
  },
  isIdentifierStart: (input) => {
    return /[a-z_@.#]/i.test(input)
  },  
  isIdentifier: (input) => {
    return Predicates.isIdentifierStart(input) || '?!-<>=0123456789.'.indexOf(input) >= 0
  },  
  isOperator: (input) => {
    return '+-*/='.indexOf(input) >= 0
  },  
  isPunctuation: (input) => {
    return ',\'(){}[]\\'.indexOf(input) >= 0
  },  
  not: (predicate) => {
    return (input) => !predicate(input)
  }
}