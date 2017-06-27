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
      body: r,
      line: a.line,
      column: a.column
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

class TeslError extends Error {
  constructor(node, e) {
    super()
    this.name = 'TeslError'
    this.__count = (e.__count ? e.__count : 0) + 1
    if (e.__count) {
      this.message = `${node.body[0].value || node.body[0].type} (${node.line}:${node.column}):\n  ${e.message}`
    } else {
      this.message = `${node.body[0].value || node.body[0].type} (${node.line}:${node.column}):\n    ${e.message}`
    }
  }
}

class Context {
  constructor(parent) {
    this.__name = 'none'
    this.parent = parent || null
    this.scope = {}

    this.__lib = {}
    this.exports = {}
    this.imports = {}

    this.__contexts = []
    
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

  async execute(node) {
    if (node.type === 'expression') {
      return await this.executeExpression(node)
    } else {
      return await this.returnValue(node)
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

  async executeExpression(node, lastResort = false) {
    let commandContext = this
    let command = await commandContext.execute(node.body[0])

    let args = node.body.slice(1).map((n) => {
      let res = (hValue) => {
        let arCtx = commandContext.spawn(`${this.__name}/${node.body[0].type === 'identifier' ? node.body[0].value : node.body[0].type}`)
        if (hValue) arCtx.scope['#'] = hValue
        return arCtx.execute(n)
      }

      res.__node = n

      return res
    })

    if (command.type === 'function') {
      try {
        return await command.value(this, ...args)
      } catch (e) {
        let er = new TeslError(node, e)
        throw er
      }
    } else if (command.type === 'identifier') {
      if (lastResort) {
        throw new Error(`Command ${command.value} is not recognized.`)
      }

      return await this.executeExpression(node, true)
    } else if (command.type === 'object') {
      let o = command

      for (let arg of args) {
        let k = await arg()
        let v = o.value
        o = v[k.value]
      }

      return o
    } else if (command.type === 'arguments') {
      if (args.length < 1) {
        throw new Error('expected at least return type :void, or a return type and function body')
      }
      
      let types = command.value
      let returnType = await args[0]()

      if (args.length === 1 && returnType.value !== 'void') {
        throw new Error('function without a body must have return type void')
      }
      
      let blocks = args.slice(1)

      return await {
        type: 'function',
        value: async (ctx, ...vargs) => {
          let c = ctx.spawn(`${this.__name}/:function`)
          if (vargs.length !== types.length) {
            throw new Error('wrong number of arguments')
          }

          for (let [index, type] of types.entries()) {
            let varg = await vargs[index]()
            
            if (type.valueType.value !== varg.type) {
              throw new Error(`expected ${type.valueType.value}, but instead got ${varg.type}`)
            }

            c.scope[type.value.value] = varg
          }

          let result
          for (let block of blocks) {
            let n = block.__node

            result = await c.execute(n)            
          }

          if (result.type !== returnType.value) {
            throw new Error(`expected function to return ${returnType.value}, but instead got ${result.type}`)
          }

          return result
        }
      }
    } else {
      throw new Error(`${command.type} is not a command.`)
    }
  }
}

function standardLibraryExtension(context) {
  context.scope['tesl'] = context.scope['.'] = {
    type: 'function',
    value: async function (ctx, ...blocks) {
      let result = { type: 'void' }
      for (let block of blocks) {
        result = await block(result)
      }

      return {
        type: 'void',
        value: '.'
      }
    }
  }

  context.scope['use'] = {
    type: 'function',
    value: async function (ctx, ...libs) {
      let rootLib = ctx.getRoot().__lib

      for (let lib of libs) {
        let v = await lib()

        if (v.value in rootLib) {
          rootLib[v.value](context)
        } else {
          throw new Error(`Library '${v.value}' not found.`)
        }
      }

      return {
        type: 'void',
        value: 'use'
      }
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