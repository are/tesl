module.exports = (Predicates) => ([
  {
    predicate: Predicates.isCommentStart,
    action: t => {
      t.input.next()
      let comment = t.readWhile(Predicates.not(Predicates.isCommentEnd))
      t.input.next()
      return {
        type: 'comment',
        value: comment,
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isDigit,
    action: t => {
      let hasDot = false
      let number = t.readWhile((input) => {
        if (input === '.') {
          if (hasDot) return false
          hasDot = true
          return true
        }
        
        return Predicates.isDigit(input)
      })
      
      return {
        type: 'number',
        value: parseFloat(number),
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isQuote,
    action: t => {
      t.input.next()
      let string = t.readWhile(Predicates.not(Predicates.isQuote))
      t.input.next()
      
      return {
        type: 'string',
        value: string,
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isIdentifierStart,
    action: t => {
      let identifier = t.readWhile(Predicates.isIdentifier)
      return {
        type: 'identifier',
        value: identifier,
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isPunctuation,
    action: t => {
      return {
        type: 'punctuation',
        value: t.input.next(),
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isOperator,
    action: t => {
      return {
        type: 'operator',
        value: t.input.next(),
        line: t.input.line,
        column: t.input.column
      }
    }
  },
  {
    predicate: Predicates.isTypeDeclarationStart,
    action: t => {
      t.input.next()
      
      t.readWhile(Predicates.isWhitespace)
      
      return {
        type: 'type',
        value: t.readWhile(Predicates.isTypeDeclaration),
        line: t.input.line,
        column: t.input.column
      }
    }
  }
])