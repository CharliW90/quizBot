const pino = require('pino');
const { PermissionFlagsBits } = require('discord.js');
const sessionManager = process.env.SESSION_MANAGER
const session = sessionManager ? sessionManager.split('/')[0] : "unknown_session"

const defaultPinoConf = {
  messageKey: 'msg'
}

const PinoLevelToSeverityLookup = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

if(session === "google_cloud"){
  defaultPinoConf.messageKey = 'message';
  defaultPinoConf.formatters = {
    level(label, number) {
      return {
        severity: PinoLevelToSeverityLookup[label] || "INFO",
        level: number,
      }
    }
  }
}

const transports = pino.transport({
  targets: [
    {
      level: 'trace',
      target: 'pino-pretty',
      options: {
        ignore: 'slashCommand,path,fn,stack,source',
      },
    },
    {
    level: 'error',
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname,path',
      singleLine: false,
    },
  },
  {
    level: 'debug',
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname,stack',
    },
  },
  {
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname,slashCommand,path,fn,stack,source,error,response,details',
    },
  }],
  dedupe: true
})

const customMixin = (input, num) => {
  if(input.code && input.message && num === 50){
    errCode = input.code;
    errMsg = input.message;
    delete input.code;
    delete input.message;
    return { msg: `${errCode}: ${errMsg}` }
  } else {
    if(input.message){
      return { msg: input.message}
    } else {
      return { msg: input.msg}
    }
  }
}

const msgPrefix = `[discord_bot](${session}) | `

const logger = pino({mixin: customMixin, msgPrefix}, transports, defaultPinoConf)

const buildCommandDetails = (localDetails) => {
  const {category, data, execute, autocomplete} = localDetails
  const {name, default_member_permissions, options} = data
  const executeDefinition = String(execute).split("execute(")[1].split(")")[0]
  const executeArgs = executeDefinition.split(",").map(arg => arg.split("=")[0])
  const details = {
    commandName: `${category}/${name}`,
    adminOnly: default_member_permissions <= PermissionFlagsBits.ManageChannels,
    userInput: options,
    execute: {
      args: executeArgs
    },
    autocomplete: typeof(autocomplete) !== 'undefined'
  }
  if(autocomplete){
    const autocompleteDefinition = String(autocomplete).split("autocomplete(")[1].split(")")[0]
    const autocompleteArgs = autocompleteDefinition.split(",").map(arg => arg.split("=")[0])
    details.autocomplete = {
      args: autocompleteArgs
    }
  }
  return details
}

const buildFunctionDetails = (properties) => {
  const details = []
  for(key in Object.keys(properties)){
    property = properties[key]
    const {id, path, filename} = property
    if(id && path && filename){
      const filePath = path.split("discord_bot/")[1] + "/"
      const fileName = filename.split(filePath)[1]
      details.push({fileName, filePath})
    }
    if(typeof(property) === 'string'){
      details.push(property)
    }
  }
  return details
}

/**
 * Creates a new pino logger - Example usage: ```const logger = localisedLogging(new Error(), arguments, this)```
 *
 * logger.info() produces minimal log message with no additional details
 * 
 * logger.debug() (suppressed by default) produces log message with additional details about functions and function calls
 * 
 * logger.error() produces log message with additional details, including error stack and functions and variables
 *
 * @generator
 * @param {Error} error - a 'new Error()' object
 * @param {IArguments} localArgs - the local 'arguments' object
 * @param {object} globalDetails - the global 'this' object
 * @param {String} trace - (optional) an identifier to help group logs by activity
 * @returns {pino.Logger}
 */
const localisedLogging = (error, localArgs, globalDetails, trace = undefined) => {
  const stackArray = error.stack.split('\n');
  const stack = stackArray.slice(1, -1).map(line => line.trim())
  const location = stackArray[1].trim()
  const details = location.split(" ")
  const args = Object.values(localArgs).map((arg) => {return arg.constructor.name ? arg.constructor.name : typeof(arg)})
  
  const filePath = details[2] ? details[2].split(":")[0] : "unknown"
  const functionName = details[1] ? `${details[1]}(${args})` : "unknown"

  const path = filePath === "unknown" ? filePath : filePath.split("discord_bot/")[1]
  const fn = functionName === "unknown" ? functionName : functionName.replace("Object", path.split('/').pop().split('.js')[0])
  const slashCommand = path === "unknown" ? slashCommand : path.split('/')[0] === 'commands'

  return logger.child({
    slashCommand,
    path,
    fn,
    source: slashCommand ? buildCommandDetails(globalDetails) : buildFunctionDetails(localArgs),
    stack,
  },{level: logger.level, msgPrefix: trace !== undefined ? `${trace} | ` : ''})
}

const toggleDebug = (toggle, blame) => {
  logger.info(`${blame} ${toggle ? 'activated' : 'deactivated'} debugging`)
  logger.level = toggle ? 'debug' : 'info'
  logger.debug("DEBUG MODE: ON")
  return `Logging set to ${toggle ? 'debug' : 'info'} level and above; ${toggle ? 'trace' : 'debug and trace'} suppressed`
}

const calls = {}
/**
 * Converts a pino logger into a 'throttled logger' which will only allow a certain number of calls to the logger
 * before suppressing further logs for a period of time.
 * @param {pino.Logger} logger a pino logger to be throttled
 * @param {number} limit _(optional) default: 4_  the number of successive logs to allow within a timeframe before suppressing further logs
 * @param {number} throttle _(optional) default: 6000_  the amount of time to suppress further logs for, given as a number of milliseconds
 * @returns {(call:string, ...args:any) => void}
 */
const throttledLogger = (logger, limit=4, throttle=6000) => {
  /**
   * A throttled pino logger - use like a pino logger, but with the log level provided as a string e.g.
   * logger.info("Hello World")
   * becomes
   * logger('info', "Hello World")
   * @param {String} call the type of log to use (e.g. info, debug, error etc.)
   * @param  {...any} args the arguments to pass into the logger
   * @returns {void}
   */
  return (call, ...args) => {
    const lastCall = calls[call];
    if(lastCall){
      if(Date.now() - lastCall.time > throttle){
        calls[call] = {time: Date.now(), count: 1};
        logger[call](...args);
        return
      } else if(lastCall.count < limit){
        calls[call] = {time: Date.now(), count: lastCall.count + 1};
        logger[call](...args);
        return
      }
    } else {
      calls[call] = {time: Date.now(), count: 1};
      logger[call](...args);
      return
    }
  }
}

const discordLogger = (message) => {
  
}

module.exports = {localisedLogging, toggleDebug, throttledLogger};