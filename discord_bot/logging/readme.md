# logging

logging is handled using __pino__ and __pino-pretty__, with [child loggers](https://getpino.io/#/docs/child-loggers) built for each file containing relevant context data, which is filtered out based on logging level using [pino transports](https://getpino.io/#/docs/transports).  __debug__ statements are left in prod code and default to suppressed - they can be toggled on/off via a [slash command](./commands/utility/debug.js) (restricted users).  __info__ and __warn__ statements help keep a running log of key actions taken.  __errors__ are also logged via pino.

[localisedLogging()](./logger.js#L101) is a logger generator function which returns a [pino child logger](https://getpino.io/#/docs/child-loggers).  Such a local logger should be created within each file, at the appropriate point, as follows:

`const logger = localisedLogging(new Error(), arguments, this)`

> {new Error()} creates an Error object, from which the child logger can infer various details about the stack trace
>
> {arguments} is a default global variable within the file which provides various details about the file
>
> {this} is a default local variable within the function which provides various details about the function

where a log is simply displaying a message, the log can be called with just a string, otherwise it should be passed an object with the key of 'msg' having the value of the desired message, and then all other key:value pairs that should be included in the log, for example:
```js
logger.error("This is just an error message")
logger.error({msg: `this message is an error from abstractedAwayFunction(${thisVariable}):`, error, thisVariable, anotherVariable})
```
```jsonc
OUTPUT:
[11:40:54.725] ERROR: This is just an error message
  ...other details provided by the child logger...
[11:40:54.806] ERROR: this message is an error from abstractedAwayFunction(actualValue):
  ...other details provided by the child logger...
  error: {
    code: 404,
    message: "a sample 404 error"
  }
  thisVariable: actualValue
```

This applies to all log types [.debug(), .info(), .warn(), .error(), .fatal()], however there are important things to note for .info() and .error():

- it should be noted that .info() provides no details other than those passed into it, and actively ignores the keys of 'error', 'response' and 'details', so displaying these requires an alternative key, for example:
  ```js
  const {error, response} = serverRequest(myName);
  logger.info("Message here");
  logger.info({msg: "Look at this error:", error, response});
  logger.info(error)
  logger.info({msg: "An error you can actually see:", err: error, res: response});
  ```
  ```jsonc
  OUTPUT:
  [11:40:54.123] INFO: Message here
  [11:40:54.456] INFO: Look at this error:
  [11:40:54.509] INFO: 
  [11:40:54.778] INFO: An error you can actually see:
    err: {
      code: 500
      message: "Silly server, it fell over while processing your request..."
    }
    res: null
  ```
- it should be noted that .error() is setup to handle our custom errors that are output in the format {error, response} where error is {code, message, details(optional)}, and therefore can be used as follows:
  ```js
  const {error, response} = abstractedAwayFunction(thisVariable);
  // returns {{code: 404, message: "This function failed to find thisVariable"}, null}
  if(error){
    logger.error({...error});
    return;
  }
  //... rest of code ...
  ```
  ```jsonc
  OUTPUT:
  [11:40:54.762] ERROR: 404: This function failed to find thisVariable:
  ...other details provided by the child logger...
  ```

  it is __EXTREMELY__ important to pass a new object to the .error() logger - pino mixins mutate input, and as such we must provide a copy of our error message.  A shallow copy such as `{...error}` will suffice because the mixin would only mutate top-level elements - however, it is risky should the mixin change, so `structuredClone(error)` would be safer.  Obviously  if the error is being discarded once it has been logged, there isn't strictly any need to copy or clone it, but it is preferable to always do so

## logging should follow these rules:
- either a plain string or a new object should __always__ be passed into our logger - following this rule will help remember other important rules, such as the need to avoid input mutation when using .error() [detailed above] - always assume it will be logger.info({}) or .error({}) as a good habit

- inside 'autocomplete()' functions, because the function is called repeatedly whilst a user is typing into the command, we should use a throttled logger, which takes the log type and message/args as its arguments.  This throttled logger will suppress log calls that are too close together (default is allow 4 logs of a given type, then suppresses those log types for 6 seconds) - for example:
  ```js
  const logger = throttledLogger(localisedLogger(new Error(), arguments, this))
  logger("debug", "message in here")
  logger("debug", {msg: `abstractedAwayFunction(${localVariable}):`, error, response, localVariable})
  ```
  ```jsonc
  OUTPUT:
  [11:40:54.108] DEBUG: message in here
  ...other details provided by the child logger...
  [11:40:54.371] DEBUG: abstractedAwayFunction("actualValue"):
  ...other details provided by the child logger...
  error: null
  response: {}
  localVariable: "actualValue"
  ```
  if we know how many such calls to expect inside one iteration of an autocomplete function, we should set the throttle to match that, for example: `const logger = throttledLogger(localisedLogger(new Error(), arguments, this), 2)` to allow two consecutive calls, before implementing the throttle of 6 seconds

- inside 'execute()' functions we should always start with a .info() log of the command name and the user calling it, so that subsequent logs are clearly headed by this detail

- inside 'execute()' functions we should only have 2-3 .info() logs following the header, bearing in mind that abstracted away functions are likely to also each include their own .info() logs

- inside 'execute()' functions we should have .debug() logs wherever the present function is handling the logic, and wherever an abstracted away function has returned values to us, for example:
  ```js
  const options = response.map((user) => {return `${user.id} = ${user.globalName}`})
  logger.debug({msg: `options:`, options})
  const {error, response} = abstractedAwayFunction(localVariable);
  logger.debug({msg: `abstractedAwayFunction(${localVariable}):`, error, response, localVariable})
  ```

- inside abstracted away functions we should have .debug() logs wherever the function is handling the logic, and where it receives data from an abstracted away function, but we should not have a .debug() log for the return values from the function, as this should be managed by .debug() logs in the code from where the call was made (as detailed in the point above)

- .info() should primarily be used to display only a string - anything more than that likely wants to be in a warn or error log
