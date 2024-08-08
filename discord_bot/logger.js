const pino = require('pino');
const { PermissionFlagsBits } = require('discord.js');

const transports = pino.transport({
  targets: [{
    level: 'error',
    target: 'pino-pretty',
    options: {
      ignore: 'pid,hostname,path,code,message',
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
      ignore: 'pid,hostname,slashCommand,path,fn,stack,source,code,message,details',
    },
  }],
  dedupe: true
})

const logger = pino({
  mixin(obj, num) {
    if(obj.code && obj.message && num === 50){
      errCode = obj.code;
      errMsg = obj.message;
      return {msg: `${errCode}: ${errMsg}`}
    } else {
      if(obj.message){
        return { msg: obj.message}
      } else {
        return { msg: obj.msg}
      }
    }
  },
},transports)

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
 * @returns {pino.Logger}
 */
const localisedLogging = (error, localArgs, globalDetails) => {
  const stackArray = error.stack.split('\n');
  const stack = stackArray.slice(1, -1).map(line => line.trim())
  const location = stackArray[1].trim()
  const details = location.split(" ")
  const arguments = Object.values(localArgs).map((arg) => {return arg.constructor.name ? arg.constructor.name : typeof(arg)})

  const filePath = details[2] ? details[2].split(":")[0] : "unknown"
  const functionName = details[1] ? `${details[1]}(${arguments})` : "unknown"

  const path = filePath.split("discord_bot/")[1]
  const fn = functionName.replace("Object", path.split('/').pop().split('.js')[0])
  const slashCommand = path.split('/')[0] === 'commands'

  return logger.child({
    slashCommand,
    path,
    fn,
    source: slashCommand ? buildCommandDetails(globalDetails) : buildFunctionDetails(localArgs),
    stack,
    level: logger.level
  })
}

const toggleDebug = (toggle, blame) => {
  logger.info(`${blame} ${toggle ? 'activated' : 'deactivated'} debugging`)
  logger.level = toggle ? 'debug' : 'info'
  logger.debug("DEBUG MODE: ON")
  return `Logging set to ${toggle ? 'debug' : 'info'} level and above; ${toggle ? 'trace' : 'debug and trace'} suppressed`
}

module.exports = {toggleDebug, localisedLogging};