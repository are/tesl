# Tesl
Tesl is a scripting language embedded in JavaScript designed for creating reactive front-end apps, but usable in any JavaScript environment. Strongly inspired by LISP and Elm.

## Syntax
```clojure
(.
  (use v2 web data)
  (print "Hello world!")
  (prog "#app"
    (data.object
      :key "hello"
    )

    (html.div 
      (html.b (state :key) " world!")
      (html.button "Change"
        (dom.listen :click (fun [e:Event]:void
          (@ state :key "bye")
        ))
      )
    )
  )
)
```

Tesl has only few syntax structures:

Name | Example | Notes |
---- | ------- | ----------- |
`string` | `"hello world"` | String are only available using `"` double quotes.
`number` | `512`, `2.12` | There are no negative numbers. You need an appropriate command. 
`kind` | `:string` | Used in type declaration, but also as an atom or key. 
`arguments` | `[x:number y:number]` | Used mainly in function declaration. 
`command` | `(print 1337)` | Building block of the whole language. Execution time depends on the function outside.

## Usage
Tesl doesn't come with a standard library, so you need to write one yourself or use the one created by me - `hello-tesl`.

Import `tesl` into your project, provide it with your `StdLib` and you are ready to execute your programs!

## Webpack quickstart example

#### `index.js`
```js
const { Tesl } = require('tesl')
const { createV2, data, web } = require('hello-tesl') // standard library

const program = require('./src/index.tisp') // we import a text file using 'raw-loader'

function createContext() {
  const context = new Tesl()

  const v2 = createV2(filename => {
    return require(`./src/${filename}.tisp`)
  }, createContext) // we need this, so our flavor of Tesl can import and execute other files

  context.provide('v2', v2) // we provide different libraries
  context.provide('web', web)
  context.provide('data', data)

  return context // we must return the instance of Tesl
}

let ctx = createContext()

ctx.execute(program) // let's go!
```
#### `src/index.tisp`
```lisp
(.
  (use v2)
  (print "Hello world")
)
```
#### `webpack.config.js`
```js
module.exports = {
  entry: './index.js',
  output: {
    filename: './bundle.js'
  },
  resolve: {
    extensions: ['.tisp', '.js']
  },
  module: {
    loaders: [
      { test: /\.tisp$/, loader: 'raw-loader' }
    ]
  }
}
```
Do `webpack-dev-server`, then open `localhost:8080` in the browser and you should now see `"hello world"` printed in the browser console!

## Contribution

You are welcome to open an issue or send me a pull request. I will be more than happy to collaborate!

## License

MIT
