const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      levelFirst: true,
      colorize: true,
      ignore: 'pid,hostname',
    }
  }
})

module.exports = logger;