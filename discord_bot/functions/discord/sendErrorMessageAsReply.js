module.exports = (interaction, errorObject, logger = console) => {
  /**
   * A handler for error messages to be sent to discord as a reply message
   * takes an error message, deconstructs it, and creates something more sensible to be sent as a reply on discord
   * then sends the message as a reply, if possible, or as a new message if not
   * @function sendErrorMessage
   * @param {Interaction} interaction the discord message relevant to the command being executed
   * @param {Object} errorObject the object returned as an error, or that is believed to contain an error
   * @param {any} [logger=console] a logger for the function to use, ideally a properly configured pino logger
   * @returns {void} this function replies to the interaction, do not attempt to reply to the interaction after calling this function
   */
  logger.debug(`Attempting to send Error Message as a Discord Reply\n${JSON.stringify(errorObject)}`)
  const { code, message, loc, ...other } = errorObject
  const messageAsReply = {}
  const nestedErrors = bubbleUpErrors(other)
  if(nestedErrors[0].fatal){
    logger.error(`Fatal Error encountered in 'bubbleUpErrors': ${nestedErrors[0].err}`)
    nestedErrors = []
  } else {
    logger.debug(`Nested Errors: ${JSON.stringify(nestedErrors)}`)
  }

  if (code && message) {
    messageAsReply.header = loc ? `${loc} | Error ${code}: ${message}` : `Error ${code}: ${message}`
    messageAsReply.errors = loc ? [{code, message, loc}] : [{code, message}]
  } else if (nestedErrors.length > 0) {
    messageAsReply.header = `${errors.length} Nested Errors found.`
    messageAsReply.errors = nestedErrors
  } else {
    messageAsReply.header = `Error was encountered, but is difficult to parse.`
  }

  const errorMessageReply = ""

  if (interaction.replied) {
    logger.debug("Interaction already replied to - sending message as a new message...")
    interaction.channel.send(errorMessageReply)
  } else {
    logger.debug("Interaction not replied to - sending message as a reply...")
    interaction.reply(errorMessageReply)
  }
}

bubbleUpErrors = async (obj, carrier=[], depth = 0) => {
  /**
   * recursively traverses an Object looking for errors
   * matches on a key of "error" or an object that looks like an error, i.e. {code, message, ..?}
   * @async
   * @function bubbleUpErrors
   * @param {any} obj the value of the key being investigated, which may itself be another object
   * @param {Array} [carrier=[]] an Array of errors that have been collected, may be empty, will be mutated in place
   * @param {number} [depth=0] the current depth of recursion, used to track nesting
   * @returns {Promise<Array>} - A promise that resolves to an array of objects,
   * where each object contains the 'depth' and the 'value' of the collected error
   */
  try{
    if (typeof (obj) === "object" && obj !== null) {
      depth++
      for (const key in obj) {
        const val = obj[key]

        if (key == "error" || (val.code && val.message)) {
          carrier.push({ depth, ...val })
        }

        await bubbleUpErrors(val, carrier, depth)
      }
    }
    return carrier
  } catch(err) {
    return [{fatal:true, err}]
  }
}
