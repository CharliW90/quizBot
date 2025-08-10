const { InstancesClient } = require('@google-cloud/compute').v1;
const logging = require('./logger.js');
const engine = require('./engine.js');

const logger = logging.logger("compute_engine_interactor")

const compute_engine = new InstancesClient();

/**
 * @typedef {object} CustomResponse
 * @property {number} code The HTTP status code of the response.
 * @property {string} status The short status message (e.g., 'OK', 'Internal Server Error').
 * @property {string} message The detailed message to be returned.
 */

/**
 * Attempts to interact with QuizBot's Google Compute Engine VM instance.
 * @returns {Promise<{error: Error | null, response: CustomResponse | null}>} An object containing either an error or a success response.
 */
exports.engineInteraction = async (request) => {
  const supported_actions = ["start", "stop", "resume", "reset", "check"];
  const action = request.toLowerCase();
  if (!supported_actions.includes(action)) {
    const msg = `${action} is not a supported action.`;
    logger.error(msg);
    return { error: Error(msg), response: null };
  }

  try {
    const quizbotEngine = engine.startup()

    // see lifecycle here: https://cloud.google.com/compute/docs/instances/instance-lifecycle
    const actions = {
      'start': () => takeActionOnEngine(compute_engine.start, quizbotEngine),
      'stop': () => takeActionOnEngine(compute_engine.stop, quizbotEngine),
      'resume': () => {return {status: "NotImplementedError()"}},
      'reset': () => {return {status: "NotImplementedError()"}},
      'check': () => getEngineStatus(quizbotEngine),
    }

    const botStatus = await actions[action]()

    const success = `${quizbotEngine.project}:${botStatus.status}`;
    logger.info(success);
    return { error: null, response: { code: 200, status: 'OK', message: success } };
  } catch (err) {
    logger.error(`Fatal Error when trying to ${request.toUpperCase()} QuizBot\n\tERROR: ${err.message}`);
    return { error: err, response: null };
  }
}

async function takeActionOnEngine(action, engine) {
  try {
    logger.info(`Attempting to ${action.toUpperCase()} ${engine.project} in ${engine.zone}...`)
    const [response] = await action(engine);
    const operation = response.latestResponse;
    console.log(`OPERATION: ${operation}`)
    await watchForCompletion(operation, engine);

    const status = getEngineStatus(engine)
    return status;
  } catch (error) {
    throw error;
  }
}

async function getEngineStatus(engine) {
  try {
    const [result] = await compute_engine.get(engine);
    return result;
  } catch(error) {
    throw error
  }
}

async function watchForCompletion(operation, engine) {
  try {
    const operationName = operation.name
    const operationZone = operation.zone.split('/').pop();
    if (operationZone !== engine.zone) {
      logger.warn(`The requested operation is in ${operationZone} but QuizBot config declares that it is in ${quizbotEngine.zone}`)
    };

    const [response] = await compute_engine.zoneOperations.wait({
      project: engine.project,
      zone: operationZone,
      operation: operationName
    });

    console.log(`RESPONSE: ${response}`)

    // debugOperationResponse(response);
    return response;
  } catch (error) {
    // debugOperationError(error);
    let customErrorMessage = `An error occured whilst waiting for the Compute Engine operation to ${operation.operationType}`
    if (error.code === 404) {
      customErrorMessage = `The Compute Engine instance ${quizbot.engine.instance} could not be found. Please check URI [${quizbot.engine.project}] and Zone [${quizbot.engine.zone}] are correct.`
    }
    if (error.code === 403) {
      customErrorMessage = `The application does not have permission to ${operation.operationType} the Compute Engine instance ${quizbot.engine.instance}. Please check permissions.`
    }
    throw new Error(customErrorMessage);
  }
}

function debugOperationResponse(response) {
  const { status, operationType } = response;
  console.log(`--- debugging ${operationType} Operation Response ---\n--- STATUS: ${status} ---\n${response}`);
  const { warnings, error } = response;

  if (warnings.length > 0) {
    console.warn(`WARN [google-cloud.compute.zoneOperations.wait]: ${response.name} returned warnings:`);
    for (warning in warnings) {
      console.warn(`\tWARN [google-cloud.compute.zoneOperations.wait]: ${warning.code}: ${warning.message}`);
    }
  } else {
    console.info(`INFO [google-cloud.compute.zoneOperations.wait]: ${response.name} returned no warnings.`);
  }
  if (error) {
    const { errors } = error;
    if (!errors || !errors.length > 0) {
      console.error(`ERROR [google-cloud.compute.zoneOperations.wait]: ${response.name} returned no error details for error:\n${error}`);
    } else {
      for (errorObj in errors) {
        console.error(`ERROR [google-cloud.compute.zoneOperations.wait]: ${errorObj.code}: ${errorObj.message}\n`);
        const { errorDetails } = errorObj;
        if (!errorDetails || !errorDetails.length > 0) {
          console.error(`\tNo Error Details Provided`);
        } else {
          for (detail in err.errorDetails) {
            console.error(`\t${JSON.stringify(detail, null, 2)}`);
          }
        }
      }
    }
  } else {
    console.info(`INFO [google-cloud.compute.zoneOperations.wait]: ${response.name} returned no errors.`);
  }
}

const debugOperationError = (error) => {
  logger.error('--- DEBUGGING GOOGLE COMPUTE ENGINE OPERATION ERROR ---');

  logger.error(`Error Code: ${error.code}`);
  logger.error(`Error Message: ${error.message}`);
  logger.error(`Stack: ${error.stack}`);

  if (error.errors && error.errors.length > 0) {
    logger.error('--- Nested Errors ---');
    error.errors.forEach((nestedError, index) => {
      logger.error(`Nested Error #${index + 1}:`);
      if (nestedError.code) logger.error(`  Code: ${nestedError.code}`);
      if (nestedError.message) logger.error(`  Message: ${nestedError.message}`);
      if (nestedError.domain) logger.error(`  Domain: ${nestedError.domain}`);
      if (nestedError.reason) logger.error(`  Reason: ${nestedError.reason}`);

      // Check for even deeper nesting, which sometimes contains more details
      if (nestedError.errorDetails) {
        logger.error('  --- Nested Error Details ---');
        logger.error(JSON.stringify(nestedError.errorDetails, null, 2));
      }
    });
  } else {
    logger.info('No nested errors found in the error object.');
  }
  logger.error('--- END OF GOOGLE COMPUTE ENGINE OPERATION ERROR ---');
};