const pino = require('pino');

const transports = pino.transport({
  targets: [{
    level: 'error',
    target: 'pino-pretty',
    options: {
      levelFirst: true,
      colorize: true,
      ignore: 'pid,hostname',
    }
  },
  {
    level: 'debug',
    target: 'pino-pretty',
    options: {
      levelFirst: true,
      colorize: true,
      ignore: 'pid,hostname',
    }
  },
  {
    target: 'pino-pretty',
    options: {
      levelFirst: true,
      colorize: true,
      ignore: 'pid,hostname,command,path,fn',
    }
  }],
  dedupe: true
})

const logger = pino({}, transports)

/**
 * @generator
 * @param {Error} error a new Error() object, from which various details can be inferred
 * @param {Array} args  a discord interaction object
 * @returns {pino.Logger}
 */
const localisedLogging = (error, args) => {
  const stackArray = error.stack.split('\n');
  const location = stackArray[1].trim()
  const details = location.split(" ")
  const arguments = Object.values(args).map((arg) => {return arg.constructor.name ? arg.constructor.name : typeof(arg)})

  const filePath = details[2] ? details[2].split(":")[0] : "unknown"
  const functionName = details[1] ? `${details[1]}(${arguments})` : "unknown"

  const path = filePath.split("discord_bot/")[1]
  const fn = functionName.replace("Object", path.split('/').pop().split('.js')[0])
  const command = path.split('/')[0] === 'commands'

  return logger.child({
    command,
    path,
    fn,
    level: logger.level
  })
}

module.exports = {logger, localisedLogging};