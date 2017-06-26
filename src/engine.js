class InputStream {
  constructor(input) {
    this.input = input
    this.position = 0
    this.line = 1
    this.column = 0
  }
  
  next() {
    let char = this.input.charAt(this.position++)
    
    if (char === '\n') {
      this.line += 1
      this.column = 0
    } else {
      this.column += 1
    }
    
    return char
  }
  
  peek() {
    return this.input.charAt(this.position)
  }
  
  eof() {
    return this.peek() === ''
  }
  
  croak(message) {
    throw new Error(`${message} (${this.line}:${this.column})`)
  }
}

class Tokenizer {
  constructor(input, table) {
    this.input = input
    this._table = table
    this.current = null
  }
  
  readNext() {
    this.readWhile((input) => {
      return ' \t\n\r'.indexOf(input) >= 0
    })
    
    if (this.input.eof()) {
      return null;
    }
    
    let char = this.input.peek()
    
    let result = this.emit(char)
    
    if (result.length === 0) {
      this.input.croak(`Unidentified character: '${char}'`)
    }
    
    return result
  }
  
  readWhile(predicate) {
    let str = ''
    while (!this.input.eof() && predicate(this.input.peek())) {
      str += this.input.next()
    }
    
    return str
  }
  
  peek() {
    if (this.current) {
      return this.current
    } else {
      let t = this.readNext()
      
      if (t) return this.current = t[0]
      else return t
    }
  }
  
  next() {
    let tok = this.current
    this.current = null
    if (tok) {
      return tok
    } else {
      let t = this.readNext()
      if (t) return t[0]
      else return t
    }
  }
  
  eof() {
    return this.peek() == null
  }
  
  croak(message) {
    this.input.croak(message)
  }
  
  emit(input) {
    return this._table.filter(entry => entry.predicate(input)).map(entry => {
      return entry.action(this)
    })
  }
}

class Parser {
  constructor(input) {
    this.input = input
  }
  
  isExpressionStart() {
    let token = this.input.peek()
    return token && token.type == 'punctuation' && token.value == '('
  }
  
  isExpressionEnd() {
    let token = this.input.peek()
    return token && token.type == 'punctuation' && token.value == ')'
  }
  
  isBlockStart() {
    let token = this.input.peek()
    return token && token.type == 'punctuation' && token.value == "'"
  }
  
  isBlockEnd() {
    return this.isExpressionEnd()
  }
  
  isArgumentsStart() {
    let token = this.input.peek()
    return token && token.type == 'punctuation' && token.value == '['
  }
  
  isArgumentsEnd() {
    let token = this.input.peek()
    return token && token.type == 'punctuation' && token.value == ']'
  }
  
  parseUntil(p) {
    let r = []
    while (!p()) {
      let e;
      if (this.isExpressionStart()) {
        e = this.parseExpression()
      } else if (this.isBlockStart()) {
        this.input.next()
        if (this.isArgumentsStart()) {
          e = this.parseObject()
        } else {
          e = this.parseExpression()
          e.type = 'block'
        }
      } else if (this.isArgumentsStart()) {
        e = this.parseArguments()
      } else {
        e = this.input.next()
      }
      
      
      
      if (e === null) break
      r.push(e)
    }
    this.input.next()
    return r
  }
  
  parseUntilArguments(p) {
    let r = []
    while (!p()) {
      let name = this.input.next()
      let type = this.input.next()
      
      r.push({
        type: 'variable',
        value: name,
        valueType: type
      })
    }
    
    return r
  }
  
  parseArguments() {
    this.input.next()
    let r = this.parseUntilArguments(this.isArgumentsEnd.bind(this))
    this.input.next()
    return {
      type: 'arguments',
      value: r
    }
  }
  
  parseUntilObject(p) {
    let r = []
    while (!p()) {
      let key = this.input.next()
      let value = this.input.next()
      
      r.push({
        type: 'entry',
        key,
        value,
      })
    }
    
    return r
  }
  
  parseObject() {
    this.input.next()
    let r = this.parseUntilObject(this.isArgumentsEnd.bind(this))
    let o = r.reduce((p, entry) => {
      p[entry.key.value] = entry.value
      return p
    }, {})
    
    this.input.next()
    return {
      type: 'object',
      value: o
    }
  }
  
  parseExpression() {
    let a = this.input.next()
    let r = this.parseUntil(this.isExpressionEnd.bind(this))
    return {
      type: 'expression',
      body: r
    }
  }
  
  parse() {
    if (this.isExpressionStart()) {
      return this.parseExpression()
    } else {
      this.input.croak('Expected expression')
    }
  }
}

class Context {
  constructor(parent) {
    this.parent = parent || null
    this.scope = {}

    this.__lib = {}
    this.exports = {}
    this.imports = {}

    this.__contexts = []
    this.__name = 'none'
  }

  getRoot() {
    let c = this
    let n = this.parent

    while (n !== null) {
      c = n
      n = n.parent
    }

    return c
  }

  spawn(name) {
    let c = new Context(this)
    c.__name = name || `${this.__name}:child`
    this.__contexts.push(c)
    return c
  }

  execute(node) { 
    if (node.type === 'expression') {
      return this.executeExpression(node)
    } else {
      return this.returnValue(node)
    }
  }

  findInScope(value) {
    if (value in this.scope) {
      return this.scope[value]
    } else {
      if (this.parent === null) {
        return false
      } else {
        return this.parent.findInScope(value)
      }
    }
  }

  returnValue(node) {
    if (node.type === 'identifier') {
      let result = this.findInScope(node.value)

      if (result) {
        return result
      }
    }

    return node
  }

  executeExpression(node, lastResort = false) {
    let commandContext = this.spawn()
    let command = commandContext.execute(node.body[0])

    commandContext.__name = `cmd: ${node.body[0].value}`

    let args = node.body.slice(1).map(n => commandContext.execute(n))

    if (command.type === 'function') {
      return command.value(this, ...args)
    } else if (command.type === 'identifier') {
      if (lastResort) {
        throw new Error(`Command ${command.value} is not recognized.`)
      }

      if (command.value === '.') {
        return {
          type: 'void'
        }
      }

      let lastResortValue = this.returnValue(command)
      return this.executeExpression(node, true)
    } else if (command.type === 'object') {
      let o = command

      args.forEach(arg => {
        let v = o.value
        o = v[arg.value]
      })

      return o
    } else {
      throw new Error(`${command.type} is not a command.`)
    }
  }
}

function standardLibraryExtension(context) {
  context.scope['use'] = {
    type: 'function',
    value: function (ctx, ...libs) {
      let rootLib = ctx.getRoot().__lib

      libs.forEach(lib => {
        if (lib.value in rootLib) {
          rootLib[lib.value](context)
        } else {
          throw new Error(`Library '${lib.value}' not found.`)
        }
      })
    }
  }
}

module.exports = {
  InputStream,
  Tokenizer,
  Parser,
  Context,
  standardLibraryExtension
}