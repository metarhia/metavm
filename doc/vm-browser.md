# VM BROWSER

It's [Node.js vm module](https://nodejs.org/api/vm.html) polyfill for a browser.

The vm module enables running code within Iframe Window contexts. The vm module is not a security mechanism. Do not use
it to run untrusted code.

A common use case is to run the code in a different Window Context. This means invoked code has a different global
object than the invoking code.

One can provide the context by contextifying an object. The invoked code treats any property in the context like a
global variable. Any changes to global variables caused by the invoked code are reflected in the context object.

Developed by [Maxim Perevalov](https://github.com/a-mountain).

### `vm.isContext(object])`

* `object` \<Object\>
* Returns: \<Object\> Returns `true` if the given `object` has been contextified using `vm.createContext()`.

### `vm.createContext([contextObject[, options]])`

* `contextObject` \<Object\>
* `options` \<Object\>
    * `name` \<string\> `name` attribute of iframes where scripts of this context run. Default: 'VM Context i', where i
      is an ascending numerical index of the created context.

    * `codeGeneration` \<Object\>
        * `strings` \<boolean\> If set to false any calls to `eval` or `Function constructor` will throw an EvalError.
          Default: `true`. If code generation functions are passed to context, EvalError won't be thrown. Unlike nodejs
          vm, calls to `GeneratorFunction` constructor won't throw EvalError.


* Returns: \<Object\> contextified object.

If given a contextObject, the `vm.createContext()` method will prepare that object so that it can be used in calls to
`vm.runInContext()` or `script.runInContext()`. Inside such scripts, the contextObject will be the global object,
retaining all of its existing properties but also having the built-in objects and functions any `window` object has.
Outside of scripts run by the vm module, global variables will remain unchanged.

### `vm.runInContext(code, contextifiedObject[, options])`

* `code` \<string\> The JavaScript code to run.
* `contextifiedObject` \<Object\> The contextified object that will be used as the global when the code is run.
* `options` \<Object\>
    * `filename` \<string\> Specifies the filename used in stack traces produced by this script. Default: '
      evalmachine.<anonymous>'

    * `timeout` <integer> Specifies the number of milliseconds to execute code before terminating iframe. This value
      must be a strictly positive integer. If timeout == 0 iframe will be removed immediately after out of script. If
      timeout == Number.MAX_VALUE iframe won't be removed by a timeout. Default: 0. setTimeout is used to
      implementation, so timeout can't prevent blocking and works only for unblocking operations.

* Returns: \<any\> the result of the very last statement executed in the script.

The `vm.runInContext()` runs code within the context of the contextifiedObject, then returns the result. Running code
does not have access to the local scope. The contextifiedObject object must have been previously contextified using
the `vm.createContext()` method. If options is a `string`, then it specifies the filename.

If `options` is a string, then it specifies the filename.

### `vm.runInThisContext(code)`

* `code` \<string\> The JavaScript code to run.
* Returns: \<any\> the result of the very last statement executed in the script.

Just runs code within the context of the current window.

### `vm.runInNewContext(code[, contextObject[, options]])`

* `code` \<string\> The JavaScript code to run.
* `contextObject` \<Object\> The contextified object that will be used as the global when the code is run.
* `options` \<Object\>
    * `filename` \<string\> Specifies the filename used in stack traces produced by this script. Default: '
      evalmachine.<anonymous>'

    * `timeout` <integer> Specifies the number of milliseconds to execute code before terminating iframe. This value
      must be a strictly positive integer. If timeout == 0 iframe will be removed immediately after out of script. If
      timeout == Number.MAX_VALUE iframe won't be removed by a timeout. Default: 0. setTimeout is used to
      implementation, so timeout can't prevent blocking and works only for unblocking operations.

    * `contextName` \<string\> `name` attribute of iframes where scripts of this context run. Default: 'VM Context i',
      where i is an ascending numerical index of the created context.

    * `contextCodeGeneration` \<Object\>
        * `strings` \<boolean\> If set to false any calls to `eval` or `Function constructor` will throw an EvalError.
          Default: `true`. If code generation functions are passed to context, EvalError won't be thrown. Unlike nodejs
          vm, calls to `GeneratorFunction` constructor won't throw EvalError.

The `vm.runInNewContext()` first contextifies the given contextObject (or creates a new contextObject if passed as
undefined), runs it within the created context, then returns the result. Running code does not have access to the local
scope.

If `options` is a string, then it specifies the filename.

### Class: `vm.Script`

Instances of the `vm.Script` class contain scripts that can be executed in specific contexts.

### `new vm.Script(code[, options])`

* `code` \<string\> The JavaScript code to run.
* `options` \<Object\>
    * `filename` \<string\> Specifies the filename used in stack traces produced by this script. Default: '
      evalmachine.<anonymous>'

If `options` is a string, then it specifies the filename.

Creating a new vm.Script object just save code but does not run it. The saved vm.Script can be run later multiple times.
The code is not bound to any global object; rather, it is bound before each run, just for that run.

### `script.runInContext(contextifiedObject[, options])`

* `contextifiedObject` \<Object\> The contextified object that will be used as the global when the code is run.
* `options` \<Object\>
    * `filename` \<string\> Specifies the filename used in stack traces produced by this script. Default: '
      evalmachine.<anonymous>'

    * `timeout` <integer> Specifies the number of milliseconds to execute code before terminating iframe. This value
      must be a strictly positive integer. If timeout == 0 iframe will be removed immediately after out of script. If
      timeout == Number.MAX_VALUE iframe won't be removed by a timeout. Default: 0. setTimeout is used to
      implementation, so timeout can't prevent blocking and works only for unblocking operations.

Runs the code contained by the vm.Script object within the given contextifiedObject and returns the result. Running code
does not have access to local scope.

### `script.runInNewContext([contextObject[, options]])`

* `contextObject` \<Object\> The contextified object that will be used as the global when the code is run.
* `options` \<Object\>
    * `filename` \<string\> Specifies the filename used in stack traces produced by this script. Default: '
      evalmachine.<anonymous>'

    * `timeout` <integer> Specifies the number of milliseconds to execute code before terminating iframe. This value
      must be a strictly positive integer. If timeout == 0 iframe will be removed immediately after out of script. If
      timeout == Number.MAX_VALUE iframe won't be removed by a timeout. Default: 0. setTimeout is used to
      implementation, so timeout can't prevent blocking and works only for unblocking operations.

    * `contextName` \<string\> `name` attribute of iframes where scripts of this context run. Default: 'VM Context i',
      where i is an ascending numerical index of the created context.

    * `contextCodeGeneration` \<Object\>
        * `strings` \<boolean\> If set to false any calls to `eval` or `Function constructor` will throw an EvalError.
          Default: `true`. If code generation functions are passed to context, EvalError won't be thrown. Unlike nodejs
          vm, calls to `GeneratorFunction` constructor won't throw EvalError.

First contextifies the given contextObject, runs the code contained by the vm.Script object within the created context,
and returns the result. Running code does not have access to local scope.

### `script.runInThisContext([options])`

* Returns: \<any\> the result of the very last statement executed in the script.

Just runs code contained by the vm.Script within the context of the current window.

## Features

### How it works

Script runs in a content window of iframe that is created for each new run of script. Lifetime of iframe equals, as
possible, to timeout option or while iframe won't be deleted by user.

`createContext` function returns `Context` wrapped by proxy that syncs context according to actual state of iframes
every invokes of `Context` methods like `get`, `has`... .

Above things needs because if script contains some async calculations it's impossible to know when script actual ends.
That's why iframe can't be deleted at once after out of script.

### Iframes

#### Attributes:

* id = "vm-sandbox:" + `Date.now()`
* class = "iframe-vm"
* name = context option `name`
* style.display = 'none'

#### How to remove

Iframe can be removed by specifies `timeout` option or removing it by hand. It's easy to do if context option `name`  is
specified and all needed iframes can be found by this option.
